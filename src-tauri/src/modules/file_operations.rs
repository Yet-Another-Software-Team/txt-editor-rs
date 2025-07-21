use std::fs::{write, read_to_string};
use std::path::Path;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn save_file(app: AppHandle, file_content: String) {
    println!("save file invoked");
    let file_path = app
        .dialog()
        .file()
        .set_file_name("untitled")
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("Text File", &["txt"])
        .blocking_save_file();

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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileData {
    file_name: String,
    content: String
}

#[tauri::command]
pub fn load_file(app: AppHandle) -> Result<(), String> {
    let file_path = match app
        .dialog()
        .file()
        .blocking_pick_file() 
    {
        Some(path) => path,
        None => return Err("File dialog was cancelled or no file selected".to_string())
    };
    
    let path = match file_path.as_path() {
        Some(p) => p,
        None => return Err("File dialog was cancelled or no file selected".to_string())
    };

    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown")
        .to_string();
    
    let content = get_file_content(path).unwrap_or(String::from(""));
    
    app.emit("file-loaded", FileData {
        file_name,
        content
    }).map_err(|e| format!("Failed to emit event: {}", e))?;
    
    Ok(())
}

fn get_file_content(path: &Path) -> Option<String> {
    match read_to_string(&path) {
        Ok(content) => Some(content),
        Err(e) => {
            eprintln!("Failed to load file: {}", e);
            None
        }
    }
}