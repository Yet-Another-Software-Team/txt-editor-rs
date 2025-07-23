// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Mutex;
use tauri::{menu::{MenuBuilder, SubmenuBuilder}};
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
                .text("open", "Open")
                .text("open_dir", "Open Folder")
                .text("quit", "Quit")
                .build()?;
            let menu = MenuBuilder::new(app)
            .items(&[&file_menu])
            .build()?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle: &tauri::AppHandle, event| {
                    match event.id().0.as_str() {
                        "save" => {app_handle.clone().emit("save", "").unwrap()},
                        "open" => {let _ = modules::file_operations::load_file(app_handle.clone()); },
                        "open_dir" => {let _ = modules::file_operations::open_directory(app_handle.clone()); },
                        "quit" => {app_handle.clone().exit(0);},
                        _ => eprintln!("unexpected menu event")
                    }
            });

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
