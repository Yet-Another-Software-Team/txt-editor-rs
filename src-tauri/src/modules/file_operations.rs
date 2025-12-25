use sha2::{Digest, Sha256};
use std::fs::{read_dir, read_to_string, write};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

/// Compute SHA256 hash of content with normalized line endings (LF)
fn compute_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    // Normalize all line endings to LF for consistent hashing
    let normalized = content.replace("\r\n", "\n");
    hasher.update(normalized.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Save a file to disk at the specified path
#[tauri::command]
pub fn save_file_to_path(file_content: String, file_path: String) -> Result<String, String> {
    let path_buf = PathBuf::from(&file_path);

    write(&path_buf, &file_content).map_err(|e| e.to_string())?;

    let file_name = path_buf
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("File")
        .to_string();

    Ok(format!("{} saved successfully", file_name))
}

/// Load file from the specified path
#[tauri::command]
pub fn load_file_from_path(path_str: String) -> Result<(String, String, String), String> {
    let path_buf = PathBuf::from(&path_str);

    let file_name = path_buf
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let content = read_to_string(&path_buf).map_err(|e| e.to_string())?;

    Ok((file_name, path_str, content))
}

/// Set the project directory path
#[tauri::command]
pub fn set_project_directory(app: AppHandle, directory_path: String) -> Result<(), String> {
    app.emit("folder-selected", &directory_path)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Read directory contents and return tuples of (path, is_directory)
#[tauri::command]
pub fn read_directory_contents(path: String) -> Result<Vec<(String, bool)>, String> {
    let entries = read_dir(&path).map_err(|e| format!("Error reading directory: {}", e))?;

    let mut contents = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            let is_dir = path.is_dir();
            let file_name = path.to_string_lossy().into_owned();
            contents.push((file_name, is_dir));
        }
    }

    Ok(contents)
}

/// Check if file content differs from what's on disk using hash comparison
/// Normalizes line endings to LF for consistent comparison across platforms
#[tauri::command]
pub fn is_dirty(path: String, current_content: String) -> bool {
    // Read the actual file content from disk
    let disk_content = match read_to_string(&path) {
        Ok(content) => content,
        Err(_) => return true, // If we can't read the file, consider it dirty
    };

    // Compute hashes with normalized line endings
    let current_hash = compute_hash(&current_content);
    let disk_hash = compute_hash(&disk_content);

    // File is dirty if hashes differ
    current_hash != disk_hash
}
