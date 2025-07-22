pub mod file_operations;


// Store application state
use std::path::PathBuf;

pub struct AppData {
    pub project_path: Option<PathBuf>
}