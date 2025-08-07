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
            app.manage(Mutex::new(modules::AppData {
                project_path: None,
                open_files: Vec::new(),
            }));
            // TODO: Move menu and title bar to tsx.
            let file_menu = SubmenuBuilder::new(app, "File")
                .text("save", "Save")
                .text("open_dir", "Open Folder")
                .text("quit", "Quit")
                .build()?;
            let menu = MenuBuilder::new(app).items(&[&file_menu]).build()?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle: &tauri::AppHandle, event| {
                match event.id().0.as_str() {
                    "save" => app_handle.clone().emit("save", "current").unwrap(),
                    "open" => {
                        // Dialog will be handled by frontend JavaScript
                        app_handle.clone().emit("open-file-dialog", ()).unwrap();
                    }
                    "open_dir" => {
                        // Dialog will be handled by frontend JavaScript
                        app_handle.clone().emit("open-folder-dialog", ()).unwrap();
                    }
                    "quit" => {
                        app_handle.clone().exit(0);
                    }
                    _ => eprintln!("unexpected menu event"),
                }
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
            modules::file_operations::read_directory_contents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
