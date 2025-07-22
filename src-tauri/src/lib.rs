// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Mutex;
mod modules;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;
    tauri::Builder::default()
        .setup(|app| {
            app.manage(Mutex::new(modules::AppData { project_path: None }));
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            modules::file_operations::save_file,
            modules::file_operations::load_file,
            modules::file_operations::open_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
