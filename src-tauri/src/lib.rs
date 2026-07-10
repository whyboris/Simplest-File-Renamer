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

fn rename_result(success: bool, error: String) -> RustRenameResult {
    if success {
        return RustRenameResult {
            result: "renamed".to_string(),
            msg: "".to_string(),
        };
    } else {
        return RustRenameResult {
            result: "error".to_string(),
            msg: error.to_string(),
        };
    }
}

#[tauri::command]
fn rename(old: &str, new: &str) -> RustRenameResult {

    if old.to_lowercase() == new.to_lowercase() {

        let wip = format!("{old}.WIP");

        match fs::rename(old, &wip) {
            Ok(_) => {
                match fs::rename(wip, new) {
                    Ok(_) =>           return rename_result(true, "".to_string()),
                    Err(err) => return rename_result(false, err.to_string())
                };
            },
            Err(err) => {       return rename_result(false, err.to_string()) }
        };
    }

    match Path::new(new).try_exists() {
        Ok(true) =>                    return rename_result(false, "file name already exists".to_string()),
        Ok(false) => {
            match fs::rename(old, new) {
                Ok(_) =>               return rename_result(true,"".to_string()),
                Err(err) =>     return rename_result(false, err.to_string())
            };
        },
        Err(err) => {           return rename_result(false, err.to_string()) }
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
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![rename, checkfileordir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
