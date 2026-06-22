use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;
use crate::db::Database;
use crate::error::ApiResponse;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    pub file_path: String,
    pub file_size: u64,
    pub record_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupPreview {
    pub record_count: i64,
    pub folder_count: i64,
    pub tag_count: i64,
    pub has_sensitive: bool,
    pub file_path: String,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupHistoryItem {
    pub id: String,
    pub backup_type: String,
    pub file_path: String,
    pub file_size: Option<i64>,
    pub include_sensitive: bool,
    pub backup_status: String,
    pub error_message: Option<String>,
    pub created_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupCreateParams {
    pub file_path: String,
    pub include_sensitive: Option<bool>,
}

#[tauri::command]
pub fn backup_create(state: State<AppState>, params: BackupCreateParams) -> Result<ApiResponse<BackupResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let include_sensitive = params.include_sensitive.unwrap_or(true);

    // Export database data as JSON
    let record_count: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM records WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let data_dir = Database::get_data_dir();
    let db_path = data_dir.join("vault.db");

    // Simple backup: copy the database file
    std::fs::copy(&db_path, &params.file_path).map_err(|e| format!("备份失败: {}", e))?;

    let file_size = std::fs::metadata(&params.file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Record backup history
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    db.conn.execute(
        "INSERT INTO backup_histories (id, backup_type, file_path, file_size, include_sensitive, backup_status, created_at)
         VALUES (?, 'manual', ?, ?, ?, 'success', ?)",
        rusqlite::params![id, params.file_path, file_size as i64, include_sensitive as i32, now],
    ).ok();

    Ok(ApiResponse::ok(BackupResult {
        file_path: params.file_path,
        file_size,
        record_count,
    }))
}

#[tauri::command]
pub fn backup_preview(state: State<AppState>, file_path: String) -> Result<ApiResponse<BackupPreview>, String> {
    // Open the backup file and read counts
    let conn = rusqlite::Connection::open(&file_path)
        .map_err(|_| "无法打开备份文件".to_string())?;

    let record_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM records WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);
    let folder_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM folders WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);
    let tag_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM tags WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);
    let has_sensitive: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM records WHERE (password_encrypted IS NOT NULL OR api_key_encrypted IS NOT NULL OR license_key_encrypted IS NOT NULL) AND deleted_at IS NULL",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|c| c > 0)
        .unwrap_or(false);

    let created_at: String = conn
        .query_row("SELECT COALESCE(MAX(applied_at), '') FROM schema_migrations", [], |row| row.get(0))
        .unwrap_or_default();

    Ok(ApiResponse::ok(BackupPreview {
        record_count,
        folder_count,
        tag_count,
        has_sensitive,
        file_path,
        created_at,
    }))
}

#[tauri::command]
pub fn backup_restore_overwrite(state: State<AppState>, file_path: String) -> Result<ApiResponse<bool>, String> {
    let data_dir = Database::get_data_dir();
    let db_path = data_dir.join("vault.db");

    // Close existing connection by dropping state - in practice we'd need to handle this better
    // For now, copy the backup over the current database
    // The app should restart after this
    drop(state);

    std::fs::copy(&file_path, &db_path).map_err(|e| format!("恢复失败: {}", e))?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn backup_list_history(state: State<AppState>) -> Result<ApiResponse<Vec<BackupHistoryItem>>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db.conn.prepare(
        "SELECT id, backup_type, file_path, file_size, include_sensitive, backup_status, error_message, created_at
         FROM backup_histories
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 50"
    ).map_err(|e| e.to_string())?;

    let items: Vec<BackupHistoryItem> = stmt
        .query_map([], |row| {
            Ok(BackupHistoryItem {
                id: row.get(0)?,
                backup_type: row.get(1)?,
                file_path: row.get(2)?,
                file_size: row.get(3)?,
                include_sensitive: row.get::<_, i32>(4)? != 0,
                backup_status: row.get(5)?,
                error_message: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ApiResponse::ok(items))
}
