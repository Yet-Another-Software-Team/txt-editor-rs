#![allow(dead_code)]

use sha2::{Digest, Sha256};
use std::fs::{read_dir, read_to_string, write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

use super::AppData;

/// Compute SHA256 hash of content
fn compute_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content);
    format!("{:x}", hasher.finalize())
}

/// Save a file to machine using the provided file path
#[tauri::command]
pub fn save_file_to_path(file_content: String, file_path: String) -> Result<String, String> {
    let path_buf = PathBuf::from(file_path);
    let path = path_buf.as_path();

    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("File")
        .to_string();

    let write_res = write(&path, file_content);

    match write_res {
        Ok(_) => Ok(format!("{} saved successfully", file_name)),
        Err(e) => Err(e.to_string()),
    }
}

/// Load file from the specified path
#[tauri::command]
pub fn load_file_from_path(app: AppHandle, path_str: String) -> Result<(String, String, String), String> {
    let path_buf = PathBuf::from(path_str);
    let path = path_buf.as_path();
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let content = get_file_content(path).unwrap_or(String::from(""));
    
    
    // Store the state of the file.
    let state = app.state::<Mutex<AppData>>();
    let mut data = state.lock().unwrap();
    
    let hash = compute_hash(&content);
    data.opened_files.push((path_buf.clone(), hash)); 

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

/// Set the project directory path (called from frontend after folder selection)
#[tauri::command]
pub fn set_project_directory(app: AppHandle, directory_path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(directory_path.clone());

    println!("Set project folder: {}", path_buf.display());
    let state = app.state::<Mutex<AppData>>();
    let mut data = state.lock().unwrap();
    data.project_path = Some(path_buf);
    app.emit("folder-selected", directory_path).unwrap();
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

#[tauri::command]
pub fn is_dirty(app: AppHandle, path: String) -> bool {
    let state = app.state::<Mutex<AppData>>();
    let data = state.lock().unwrap();

    let path_buf = PathBuf::from(&path);

    let stored_content = data
        .opened_files
        .iter()
        .find(|(file_path, _)| file_path == &path_buf)
        .map(|(_, content)| content.clone());

    let Some(stored) = stored_content else {
        return false;
    };

    let current_content = get_file_content(&path_buf).unwrap_or_default();

    let stored_hash = compute_hash(&stored);
    let current_hash = compute_hash(&current_content);

    current_hash != stored_hash
}
