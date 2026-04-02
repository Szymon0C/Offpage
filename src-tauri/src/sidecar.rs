use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

pub struct SidecarState {
    child: Arc<Mutex<Option<CommandChild>>>,
    pub port: Mutex<u16>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            port: Mutex::new(8080),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
struct SidecarEvent {
    message: String,
    source: String,
}

#[tauri::command]
pub async fn start_sidecar<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SidecarState>,
    model_path: String,
    port: Option<u16>,
) -> Result<u16, String> {
    let port = port.unwrap_or(8080);

    // Atomically check and spawn while holding the lock
    let mut rx = {
        let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
        if child_lock.is_some() {
            return Err("Sidecar is already running".to_string());
        }

        let (rx, child) = app
            .shell()
            .sidecar("llama-server")
            .map_err(|e| format!("Failed to create sidecar command: {}", e))?
            .args([
                "-m",
                &model_path,
                "--port",
                &port.to_string(),
                "--host",
                "127.0.0.1",
                "-ngl",
                "99",
            ])
            .spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

        *child_lock = Some(child);
        rx
    };

    // Store port
    {
        let mut port_lock = state.port.lock().map_err(|e| e.to_string())?;
        *port_lock = port;
    }

    // Monitor stdout/stderr via Tauri events
    let app_clone = app.clone();
    let child_arc = state.child.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let msg = String::from_utf8_lossy(&line).to_string();
                    let _ = app_clone.emit(
                        "sidecar-output",
                        SidecarEvent {
                            message: msg,
                            source: "stdout".to_string(),
                        },
                    );
                }
                CommandEvent::Stderr(line) => {
                    let msg = String::from_utf8_lossy(&line).to_string();
                    let _ = app_clone.emit(
                        "sidecar-output",
                        SidecarEvent {
                            message: msg,
                            source: "stderr".to_string(),
                        },
                    );
                }
                CommandEvent::Terminated(status) => {
                    if let Ok(mut child_lock) = child_arc.lock() {
                        *child_lock = None;
                    }
                    let _ = app_clone.emit(
                        "sidecar-output",
                        SidecarEvent {
                            message: format!("Process terminated with status: {:?}", status),
                            source: "system".to_string(),
                        },
                    );
                    break;
                }
                _ => {}
            }
        }
    });

    // Poll /health endpoint for readiness (30s timeout)
    let health_url = format!("http://127.0.0.1:{}/health", port);
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(30);

    loop {
        if start.elapsed() > timeout {
            // Cleanup: take and kill the child process on timeout
            let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
            if let Some(mut child) = child_lock.take() {
                let _ = child.kill();
                // Spawn a task to wait for the child to fully terminate
                tauri::async_runtime::spawn(async move {
                    let _ = child.wait().await;
                });
            }
            return Err("Sidecar health check timed out after 30 seconds".to_string());
        }

        match client.get(&health_url).send().await {
            Ok(resp) if resp.status().is_success() => break,
            _ => {
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            }
        }
    }

    Ok(port)
}

#[tauri::command]
pub fn stop_sidecar(state: tauri::State<'_, SidecarState>) -> Result<(), String> {
    let mut child = state.child.lock().map_err(|e| e.to_string())?;
    if let Some(child_process) = child.take() {
        child_process.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn sidecar_status(state: tauri::State<'_, SidecarState>) -> Result<bool, String> {
    let child = state.child.lock().map_err(|e| e.to_string())?;
    Ok(child.is_some())
}