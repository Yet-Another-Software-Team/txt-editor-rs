// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod modules;

// Application State Storer
struct AppData {
    saved_path: Option<String>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;
    tauri::Builder::default()
        .setup(|app| {
            app.manage(AppData { saved_path: None });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            modules::file_operations::save_file,
            modules::file_operations::load_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
