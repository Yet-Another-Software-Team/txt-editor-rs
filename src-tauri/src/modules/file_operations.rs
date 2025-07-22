use std::fs::{write, read_to_string};
use std::path::{Path, PathBuf};
use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, FilePath};

use super::AppData;

#[tauri::command]
pub fn save_file(app: AppHandle, file_content: String) -> Result<(), String>  {
    let file_path = match app
        .dialog()
        .file()
        .set_file_name("untitled")
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("Text File", &["txt"])
        .blocking_save_file() 
    {
        Some(fp) => fp,
        None => return Err("File save dialog was cancelled or failed.".to_string())
    };

    let path = match file_path.as_path() {
        Some(p) => p,
        None => return Err("File save dialog was cancelled or failed.".to_string())
    };

    let write_res = write(&path, file_content);

    if write_res.is_err() {
        return write_res.map_err(|e| format!("Failed to save file: {:?}", e))
    };

    Ok(())
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

#[tauri::command]
pub fn open_directory(app: AppHandle) -> Result<(), String> {
    let file_path: FilePath = match app
        .dialog()
        .file()
        .blocking_pick_folder()
         
    {
        Some(path) => path,
        None => return Err("File dialog was cancelled or no file selected".to_string())
    };

    let path = match file_path.as_path() {
        Some(p) => p,
        None => return Err("File dialog was cancelled or no file selected".to_string())
    };

    println!("Open folder: {}", path.display());
    let state= app.state::<Mutex<AppData>>();
    let mut data = state.lock().unwrap();
    data.project_path = Some(path.to_path_buf()); // Convert to PathBuf
    app.emit("folder-selected", path.display().to_string()).unwrap();
    Ok(())
}