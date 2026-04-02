use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

pub struct SidecarState {
    child: Mutex<Option<CommandChild>>,
    pub port: Mutex<u16>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
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
    // Check if already running
    {
        let child = state.child.lock().map_err(|e| e.to_string())?;
        if child.is_some() {
            return Err("Sidecar is already running".to_string());
        }
    }

    let port = port.unwrap_or(8080);

    let (mut rx, child) = app
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

    // Store child process and port
    {
        let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
        *child_lock = Some(child);
    }
    {
        let mut port_lock = state.port.lock().map_err(|e| e.to_string())?;
        *port_lock = port;
    }

    // Monitor stdout/stderr via Tauri events
    let app_clone = app.clone();
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
