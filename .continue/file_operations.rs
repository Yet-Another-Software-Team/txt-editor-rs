use tauri::App;
#[tauri::command]
pub fn save_file() {
    let file_path = app
        .dialog()
        .file()
        .add_filter("My Filter", &["png", "jpeg"])
        .blocking_save_file();
    println!("Save to File was invoked,")
}
