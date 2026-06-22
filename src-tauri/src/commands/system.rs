use serde::Serialize;
use tauri::State;
use crate::AppState;
use crate::db::Database;
use crate::error::ApiResponse;

#[tauri::command]
pub fn system_open_url(url: String) -> Result<ApiResponse<bool>, String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| format!("打开链接失败: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("打开链接失败: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("打开链接失败: {}", e))?;
    }
    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn system_open_data_dir() -> Result<ApiResponse<String>, String> {
    let data_dir = Database::get_data_dir();
    let path = data_dir.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
    }

    Ok(ApiResponse::ok(path))
}

#[tauri::command]
pub async fn system_choose_file(
    app_handle: tauri::AppHandle,
    title: Option<String>,
    filters: Option<Vec<(String, Vec<String>)>>,
) -> Result<ApiResponse<Option<String>>, String> {
    use tauri::api::dialog::FileDialogBuilder;

    let (tx, rx) = std::sync::mpsc::channel();

    let mut dialog = FileDialogBuilder::new();
    if let Some(t) = title {
        dialog = dialog.set_title(&t);
    }
    if let Some(f) = filters {
        for (name, extensions) in &f {
            let ext_refs: Vec<&str> = extensions.iter().map(|s| s.as_str()).collect();
            dialog = dialog.add_filter(name, &ext_refs);
        }
    }

    dialog.pick_file(move |path| {
        tx.send(path.map(|p| p.to_string_lossy().to_string())).ok();
    });

    let result = rx.recv().map_err(|_| "对话框取消".to_string())?;
    Ok(ApiResponse::ok(result))
}

#[tauri::command]
pub async fn system_choose_directory(
    app_handle: tauri::AppHandle,
    title: Option<String>,
) -> Result<ApiResponse<Option<String>>, String> {
    use tauri::api::dialog::FileDialogBuilder;

    let (tx, rx) = std::sync::mpsc::channel();

    let mut dialog = FileDialogBuilder::new();
    if let Some(t) = title {
        dialog = dialog.set_title(&t);
    }

    dialog.pick_folder(move |path| {
        tx.send(path.map(|p| p.to_string_lossy().to_string())).ok();
    });

    let result = rx.recv().map_err(|_| "对话框取消".to_string())?;
    Ok(ApiResponse::ok(result))
}
