// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Serialize)]
pub struct FileOrDir {
    is_file: bool,
    is_directory: bool,
}

#[derive(Serialize)]
pub struct RustRenameResult {
    result: String,
    msg: String,
}

#[tauri::command]
fn rename(old: &str, new: &str) -> RustRenameResult {
    let file_exists_test = match Path::new(new).try_exists() {
        Ok(true) => "1",  // filename already exists -- CAN NOT rename
        Ok(false) => "2", // good news -- you can try to rename
        Err(e) => &e.to_string(),
    };

    let mut outcome = "renamed";
    let mut err_msg: String = "".to_string();

    if file_exists_test == "1" {
        outcome = "error";
        err_msg = "file name already exists".to_string();
    } else if file_exists_test == "2" {
        let rename_operation_done: String = match fs::rename(old, new) {
            Ok(_) => "renamed".to_string(),
            Err(err) => err.to_string(),
        };

        if rename_operation_done != "renamed" {
            outcome = "error";
            err_msg = rename_operation_done;
        }
    } else {
        outcome = "error";
        err_msg = file_exists_test.to_string();
    }

    return RustRenameResult {
        result: outcome.to_string(),
        msg: err_msg.to_string(),
    };
}

#[tauri::command]
fn checkfileordir(pathstring: &str) -> FileOrDir {
    let path = Path::new(pathstring);

    return FileOrDir {
        is_file: path.is_file(),
        is_directory: path.is_dir(),
    };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![rename, checkfileordir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
