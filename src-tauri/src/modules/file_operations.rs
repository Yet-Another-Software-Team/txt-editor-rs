#![allow(dead_code)]

use std::fs::{read_dir, read_to_string, write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, FilePath};

use super::AppData;

/// Save a file to machine
/// 
/// using file_path to determine whether using Tauri Dialog or save it to path specified from frontend. 
#[tauri::command]
pub fn save_file(app: AppHandle, file_content: String, file_path: Option<String>) -> Result<String, String> {
    return if file_path.is_none() {save_file_dialog(app, file_content)} else {save_file_path(file_content, file_path.unwrap())}
}

/// Save file via Dialog
/// 
/// Using Tauri Dialog to select location and file name to be saved to.
fn save_file_dialog(app: AppHandle, file_content: String)  -> Result<String, String> {
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

     let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("File")
        .to_string();

    let write_res = write(&path, file_content);    

    match write_res {
        Ok(_) => return Ok(format!("{} saved successfully", file_name)),
        Err(e) => return Err(e.to_string()) 
    }


}

/// Save file via the path given by string.
fn save_file_path(file_content: String, path_str: String) -> Result<String, String> {
    let path_buf = PathBuf::from(path_str);
    let path = path_buf.as_path();

    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("File")
        .to_string();

    let write_res = write(&path, file_content);    

    match write_res {
        Ok(_) => return Ok(format!("{} saved successfully", file_name)),
        Err(e) => return Err(e.to_string()) 
    }
}

/// Tauri command to load file from machine.
/// 
/// Tauri command allows optionally path if path is passed, function will invoke load_path(), otherwise load_dialog()
#[tauri::command]
pub fn load_file(app: AppHandle, path: Option<String>) -> Result<(String, String, String), String> {
    return if path.is_none() { load_dialog(app) } else { load_path(path.unwrap()) }
}

/// Open Tauri Dialog and load file content from it.
/// 
/// Using Tauri Dialog Plugin to allows user to pick the file from any user's machine to load contents from.
fn load_dialog(app: AppHandle) -> Result<(String, String, String), String> {
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
    
    Ok((file_name, path.to_str().unwrap().to_string(), content))
}

/// Load file form path
/// 
/// This function get use path string to get the file content from specified path
fn load_path(path_str: String) -> Result<(String, String, String), String> {
    
    let path_buf = PathBuf::from(path_str);
    let path =  path_buf.as_path();
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let content = get_file_content(path).unwrap_or(String::from(""));

    Ok((file_name, path.to_str().unwrap().to_string(), content))
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
pub fn read_directory_contents(path: String) -> Result<Vec<(String, bool)>, String> {
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
