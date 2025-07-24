use std::fs::{read_dir, read_to_string, write};
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
pub fn load_file(app: AppHandle, path: Option<String>) -> Result<(), String> {
    return if path.is_none() { load_dialog(app) } else { load_path(app, path.unwrap()) }
}

fn load_dialog(app: AppHandle) -> Result<(), String> {
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

fn load_path(app: AppHandle, path_str: String) -> Result<(), String> {
    let path_buf = PathBuf::from(path_str);
    let path =  path_buf.as_path();
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

#[tauri::command]
pub fn read_directory_contents(app: AppHandle, path: String) -> Result<Vec<(String, bool)>, String> {
    let paths = match read_dir(&path) {
        Ok(paths) => paths,
        Err(e) => return Err(format!("Error reading directory: {}", e)),
    };

    let mut contents = Vec::new();
    for entry in paths {
        if let Ok(entry) = entry {
            let path = entry.path();
            let is_dir = path.is_dir();
            let file_name = path.to_string_lossy().into_owned();
            contents.push((file_name, is_dir));
        }
    }
    
    Ok(contents)
}
