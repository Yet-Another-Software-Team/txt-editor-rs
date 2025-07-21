
use std::fs::write;
use tauri::{AppHandle};
use tauri_plugin_dialog::DialogExt; // Import AppHandle

#[tauri::command]
pub fn save_file(app: AppHandle, file_content: String) {
    // Add app: AppHandle as an argument
    // Access the dialog plugin via the app handle
    let file_path = app
        .dialog()
        .file()
        .set_file_name("untitled")
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("Text File", &["txt"])
        .blocking_save_file();

        println!("Content is: {:?}", file_content);
    match file_path {
        Some(path) => {
            match path.as_path() {
                Some(p) => {
                    match write(&p, file_content) {
                        Ok(_) => println!("File successfully saved to: {:?}", path),
                        Err(e) => eprintln!("Failed to save file to {}: {:?}", path, e),
                    }
                },
                None => println!("File save dialog was cancelled or failed.")
            }

        },
        None => println!("File save dialog was cancelled or failed."),
    }
}
