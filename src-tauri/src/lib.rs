mod ai;
mod hardware;
mod models;
mod sidecar;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .manage(sidecar::SidecarState::default())
        .invoke_handler(tauri::generate_handler![
            sidecar::start_sidecar,
            sidecar::stop_sidecar,
            sidecar::sidecar_status,
            ai::stream_generate,
            hardware::get_hardware_info,
            models::download_model,
            models::list_available_models,
            models::check_model_exists,
            models::get_model_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
