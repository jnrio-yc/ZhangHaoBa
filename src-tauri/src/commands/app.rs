use serde::Serialize;
use tauri::State;
use crate::AppState;
use crate::db::Database;
use crate::error::ApiResponse;

#[derive(Serialize)]
pub struct AppInfo {
    pub version: String,
    pub data_dir: String,
    pub db_size: u64,
    pub record_count: i64,
    pub folder_count: i64,
    pub tag_count: i64,
    pub product_name: String,
    pub developer_id: String,
    pub build_signature: String,
    pub copyright: String,
}

#[tauri::command]
pub fn app_init(state: State<AppState>) -> Result<ApiResponse<bool>, String> {
    // Database is already initialized via AppState
    // This command can be used for any additional initialization
    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn app_get_info(state: State<AppState>) -> Result<ApiResponse<AppInfo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let record_count: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM records WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let folder_count: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM folders WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let tag_count: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM tags WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let data_dir = Database::get_data_dir();
    let db_path = data_dir.join("vault.db");
    let db_size = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);

    Ok(ApiResponse::ok(AppInfo {
        version: "1.0.0".to_string(),
        data_dir: data_dir.to_string_lossy().to_string(),
        db_size,
        record_count,
        folder_count,
        tag_count,
        product_name: "账号仓".to_string(),
        developer_id: "寂镜jnrio".to_string(),
        build_signature: "account-vault::jijing-jnrio::desktop-local-vault::2026".to_string(),
        copyright: "Copyright (c) 2026 寂镜jnrio. All rights reserved.".to_string(),
    }))
}
