pub mod file_operations;


// Store application state
use std::path::PathBuf;

pub struct AppData {
    pub project_path: Option<PathBuf>,
    pub opened_files: Vec<(PathBuf, String)> //Store Path of file and Hashes of contents, to determine if the file is changed by other application/process.
}