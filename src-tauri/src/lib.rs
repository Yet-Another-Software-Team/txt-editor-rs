// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Mutex;
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::Emitter;
mod modules;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;
    tauri::Builder::default()
        .setup(|app| {
            app.manage(Mutex::new(modules::AppData { project_path: None }));

            let file_menu = SubmenuBuilder::new(app, "File")
                .text("save", "Save")
                .text("open_dir", "Open Folder")
                .text("quit", "Quit")
                .build()?;
            let menu = MenuBuilder::new(app).items(&[&file_menu]).build()?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| match event.id().0.as_str() {
                "save" => {
                    let _ = app_handle.emit("save", ());
                }
                "open_dir" => {
                    let _ = app_handle.emit("open-folder-dialog", ());
                }
                "quit" => {
                    app_handle.exit(0);
                }
                _ => {}
            });

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            modules::file_operations::save_file_to_path,
            modules::file_operations::load_file_from_path,
            modules::file_operations::set_project_directory,
            modules::file_operations::read_directory_contents,
            modules::file_operations::is_dirty
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
