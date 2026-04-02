use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Runtime};

use crate::sidecar::SidecarState;

#[derive(Debug, Clone, Serialize)]
pub struct AiChunk {
    pub token: String,
    pub done: bool,
}

#[derive(Deserialize)]
struct ChatDelta {
    content: Option<String>,
}

#[derive(Deserialize)]
struct ChatChoice {
    delta: ChatDelta,
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct ChatChunkResponse {
    choices: Vec<ChatChoice>,
}

#[tauri::command]
pub async fn stream_generate<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, SidecarState>,
    messages: Vec<serde_json::Value>,
) -> Result<String, String> {
    let port = {
        let port_lock = state.port.lock().map_err(|e| e.to_string())?;
        *port_lock
    };

    let url = format!("http://127.0.0.1:{}/v1/chat/completions", port);

    let body = serde_json::json!({
        "messages": messages,
        "stream": true,
    });

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned status: {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut full_response = String::new();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);

        // Process complete SSE lines
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() || !line.starts_with("data: ") {
                continue;
            }

            let data = &line[6..];

            if data == "[DONE]" {
                let _ = app.emit(
                    "ai-chunk",
                    AiChunk {
                        token: String::new(),
                        done: true,
                    },
                );
                return Ok(full_response);
            }

            if let Ok(parsed) = serde_json::from_str::<ChatChunkResponse>(data) {
                for choice in &parsed.choices {
                    if let Some(content) = &choice.delta.content {
                        full_response.push_str(content);
                        let _ = app.emit(
                            "ai-chunk",
                            AiChunk {
                                token: content.clone(),
                                done: choice.finish_reason.is_some(),
                            },
                        );
                    }
                }
            }
        }
    }

    Ok(full_response)
}
