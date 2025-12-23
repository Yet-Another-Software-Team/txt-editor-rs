pub mod file_operations;

use std::path::PathBuf;

/// Application state
pub struct AppData {
    pub project_path: Option<PathBuf>,
}
