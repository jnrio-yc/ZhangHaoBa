use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;
use crate::error::ApiResponse;

#[derive(Serialize)]
pub struct PendingItem {
    pub id: String,
    pub raw_text: String,
    pub parsed_json: Option<String>,
    pub recommended_type: Option<String>,
    pub recommended_folder_id: Option<String>,
    pub confidence_level: Option<String>,
    pub status: String,
    pub source: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct PendingCreateParams {
    pub raw_text: String,
    pub source: Option<String>,
}

#[derive(Deserialize)]
pub struct PendingUpdateParams {
    pub id: String,
    pub raw_text: Option<String>,
    pub parsed_json: Option<String>,
    pub recommended_type: Option<String>,
    pub recommended_folder_id: Option<String>,
}

#[derive(Deserialize)]
pub struct PendingResolveParams {
    pub pending_id: String,
    pub record_id: String,
}

#[tauri::command]
pub fn pending_list(state: State<AppState>) -> Result<ApiResponse<Vec<PendingItem>>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db.conn.prepare(
        "SELECT id, raw_text, parsed_json, recommended_type, recommended_folder_id,
                confidence_level, status, source, created_at, updated_at
         FROM pending_raw_items
         WHERE deleted_at IS NULL AND status = 'pending'
         ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let items: Vec<PendingItem> = stmt
        .query_map([], |row| {
            Ok(PendingItem {
                id: row.get(0)?,
                raw_text: row.get(1)?,
                parsed_json: row.get(2)?,
                recommended_type: row.get(3)?,
                recommended_folder_id: row.get(4)?,
                confidence_level: row.get(5)?,
                status: row.get(6)?,
                source: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ApiResponse::ok(items))
}

#[tauri::command]
pub fn pending_create(state: State<AppState>, params: PendingCreateParams) -> Result<ApiResponse<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "INSERT INTO pending_raw_items (id, raw_text, source, status, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?)",
        rusqlite::params![id, params.raw_text, params.source.unwrap_or("manual".to_string()), now, now],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(id))
}

#[tauri::command]
pub fn pending_get_detail(state: State<AppState>, id: String) -> Result<ApiResponse<PendingItem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let item = db.conn.query_row(
        "SELECT id, raw_text, parsed_json, recommended_type, recommended_folder_id,
                confidence_level, status, source, created_at, updated_at
         FROM pending_raw_items WHERE id = ? AND deleted_at IS NULL",
        [&id],
        |row| {
            Ok(PendingItem {
                id: row.get(0)?,
                raw_text: row.get(1)?,
                parsed_json: row.get(2)?,
                recommended_type: row.get(3)?,
                recommended_folder_id: row.get(4)?,
                confidence_level: row.get(5)?,
                status: row.get(6)?,
                source: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    ).map_err(|_| "待整理项不存在".to_string())?;

    Ok(ApiResponse::ok(item))
}

#[tauri::command]
pub fn pending_update(state: State<AppState>, params: PendingUpdateParams) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let mut set_clauses = vec!["updated_at = ?".to_string()];
    let mut bind_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];

    if let Some(ref raw_text) = params.raw_text {
        set_clauses.push("raw_text = ?".to_string());
        bind_values.push(Box::new(raw_text.clone()));
    }
    if let Some(ref parsed_json) = params.parsed_json {
        set_clauses.push("parsed_json = ?".to_string());
        bind_values.push(Box::new(parsed_json.clone()));
    }
    if let Some(ref recommended_type) = params.recommended_type {
        set_clauses.push("recommended_type = ?".to_string());
        bind_values.push(Box::new(recommended_type.clone()));
    }
    if let Some(ref recommended_folder_id) = params.recommended_folder_id {
        set_clauses.push("recommended_folder_id = ?".to_string());
        bind_values.push(Box::new(recommended_folder_id.clone()));
    }

    bind_values.push(Box::new(params.id.clone()));

    let sql = format!("UPDATE pending_raw_items SET {} WHERE id = ? AND deleted_at IS NULL", set_clauses.join(", "));
    let params_ref: Vec<&dyn rusqlite::types::ToSql> = bind_values.iter().map(|b| b.as_ref()).collect();
    db.conn.execute(&sql, params_ref.as_slice()).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn pending_resolve_to_record(state: State<AppState>, params: PendingResolveParams) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "UPDATE pending_raw_items SET status = 'resolved', record_id = ?, resolved_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![params.record_id, now, now, params.pending_id],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn pending_delete(state: State<AppState>, id: String) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "UPDATE pending_raw_items SET deleted_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![now, now, id],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}
