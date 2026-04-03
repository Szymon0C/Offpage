use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Emitter, Manager};
use reqwest::Client;
use futures_util::StreamExt;

#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    pub size: String,
    pub url: String,
    pub filename: String,
}

#[tauri::command]
pub async fn download_model(
    app: AppHandle,
    model_url: String,
    filename: String,
) -> Result<(), String> {
    let client = Client::new();
    let models_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("models");

    // Create models directory if it doesn't exist
    fs::create_dir_all(&models_dir).map_err(|e| format!("Failed to create models dir: {}", e))?;

    let file_path = models_dir.join(&filename);

    // Check if file already exists
    if file_path.exists() {
        return Ok(());
    }

    let response = client
        .get(&model_url)
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    let total_size = response
        .content_length()
        .ok_or("Failed to get content length")?;

    let mut file = fs::File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk: bytes::Bytes = chunk.map_err(|e| format!("Download error: {}", e))?;
        std::io::copy(&mut chunk.as_ref(), &mut file)
            .map_err(|e| format!("Failed to write chunk: {}", e))?;

        downloaded += chunk.len() as u64;

        let percentage = (downloaded as f64 / total_size as f64) * 100.0;

        let progress = DownloadProgress {
            downloaded,
            total: total_size,
            percentage,
        };

        let _ = app.emit("download-progress", progress);
    }

    let _ = app.emit("download-complete", filename);

    Ok(())
}

#[tauri::command]
pub async fn list_available_models() -> Result<Vec<ModelInfo>, String> {
    // Return predefined list of recommended models based on hardware
    Ok(vec![
        ModelInfo {
            name: "Qwen2.5-Coder-7B-Instruct (Recommended)".to_string(),
            size: "~4.3 GB".to_string(),
            url: "https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_0.gguf".to_string(),
            filename: "qwen2.5-coder-7b-instruct-q4_0.gguf".to_string(),
        },
        ModelInfo {
            name: "Qwen2.5-Coder-3B-Instruct (Minimum hardware)".to_string(),
            size: "~2.0 GB".to_string(),
            url: "https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/main/qwen2.5-coder-3b-instruct-q4_0.gguf".to_string(),
            filename: "qwen2.5-coder-3b-instruct-q4_0.gguf".to_string(),
        },
    ])
}

#[tauri::command]
pub async fn check_model_exists(app: AppHandle, filename: String) -> Result<bool, String> {
    let models_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("models");

    let file_path = models_dir.join(filename);
    Ok(file_path.exists())
}

#[tauri::command]
pub async fn get_model_path(app: AppHandle, filename: String) -> Result<String, String> {
    let models_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("models");

    let file_path = models_dir.join(filename);
    file_path
        .to_str()
        .ok_or("Failed to convert path to string".to_string())
        .map(|s: &str| s.to_string())
}