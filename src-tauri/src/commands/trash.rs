use serde::Serialize;
use tauri::State;
use crate::AppState;
use crate::error::ApiResponse;

#[derive(Serialize)]
pub struct TrashItem {
    pub id: String,
    pub title: String,
    pub r#type: String,
    pub folder_name: Option<String>,
    pub deleted_at: String,
}

#[tauri::command]
pub fn trash_list(state: State<AppState>) -> Result<ApiResponse<Vec<TrashItem>>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db.conn.prepare(
        "SELECT r.id, r.title, r.type, f.name, r.deleted_at
         FROM records r
         LEFT JOIN folders f ON r.folder_id = f.id
         WHERE r.deleted_at IS NOT NULL
         ORDER BY r.deleted_at DESC"
    ).map_err(|e| e.to_string())?;

    let items: Vec<TrashItem> = stmt
        .query_map([], |row| {
            Ok(TrashItem {
                id: row.get(0)?,
                title: row.get(1)?,
                r#type: row.get(2)?,
                folder_name: row.get(3)?,
                deleted_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ApiResponse::ok(items))
}

#[tauri::command]
pub fn trash_empty(state: State<AppState>) -> Result<ApiResponse<i64>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Get all trashed record IDs
    let mut stmt = db.conn.prepare(
        "SELECT id FROM records WHERE deleted_at IS NOT NULL"
    ).map_err(|e| e.to_string())?;

    let ids: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let count = ids.len() as i64;

    for id in &ids {
        db.conn.execute("DELETE FROM record_tags WHERE record_id = ?", [id]).ok();
        db.conn.execute("DELETE FROM custom_fields WHERE record_id = ?", [id]).ok();
        db.conn.execute("DELETE FROM environment_entries WHERE record_id = ?", [id]).ok();
        db.conn.execute("DELETE FROM record_models WHERE record_id = ?", [id]).ok();
        db.conn.execute("DELETE FROM usage_logs WHERE record_id = ?", [id]).ok();
        db.conn.execute("DELETE FROM records WHERE id = ?", [id]).ok();
    }

    Ok(ApiResponse::ok(count))
}
