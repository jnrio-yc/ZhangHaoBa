use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;
use crate::error::ApiResponse;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagItem {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub group_key: String,
    pub sort_order: i32,
    pub is_system: bool,
    pub record_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagCreateParams {
    pub name: String,
    pub color: Option<String>,
    pub group_key: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagUpdateParams {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
    pub group_key: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagMergeParams {
    pub source_id: String,
    pub target_id: String,
}

#[tauri::command]
pub fn tag_list(state: State<AppState>) -> Result<ApiResponse<Vec<TagItem>>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db.conn.prepare(
        "SELECT t.id, t.name, t.color, t.group_key, t.sort_order, t.is_system,
                t.created_at, t.updated_at,
                (SELECT COUNT(*) FROM record_tags rt
                 JOIN records r ON rt.record_id = r.id
                 WHERE rt.tag_id = t.id AND r.deleted_at IS NULL) as record_count
         FROM tags t
         WHERE t.deleted_at IS NULL
         ORDER BY t.group_key ASC, t.sort_order ASC, t.name ASC"
    ).map_err(|e| e.to_string())?;

    let items: Vec<TagItem> = stmt
        .query_map([], |row| {
            Ok(TagItem {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                group_key: row.get(3)?,
                sort_order: row.get(4)?,
                is_system: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                record_count: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ApiResponse::ok(items))
}

#[tauri::command]
pub fn tag_create(state: State<AppState>, params: TagCreateParams) -> Result<ApiResponse<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let group_key = params.group_key.unwrap_or_else(|| "custom".to_string());

    let max_sort: i32 = db.conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) FROM tags WHERE group_key = ? AND deleted_at IS NULL",
            [&group_key],
            |row| row.get(0),
        )
        .unwrap_or(0);

    db.conn.execute(
        "INSERT INTO tags (id, name, color, group_key, sort_order, is_system, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
        rusqlite::params![id, params.name, params.color, group_key, max_sort + 10, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(id))
}

#[tauri::command]
pub fn tag_update(state: State<AppState>, params: TagUpdateParams) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let mut set_clauses = vec!["updated_at = ?".to_string()];
    let mut bind_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];

    if let Some(ref name) = params.name {
        set_clauses.push("name = ?".to_string());
        bind_values.push(Box::new(name.clone()));
    }
    if let Some(ref color) = params.color {
        set_clauses.push("color = ?".to_string());
        bind_values.push(Box::new(color.clone()));
    }
    if let Some(ref group_key) = params.group_key {
        set_clauses.push("group_key = ?".to_string());
        bind_values.push(Box::new(group_key.clone()));
    }
    if let Some(sort_order) = params.sort_order {
        set_clauses.push("sort_order = ?".to_string());
        bind_values.push(Box::new(sort_order));
    }

    bind_values.push(Box::new(params.id.clone()));

    let sql = format!("UPDATE tags SET {} WHERE id = ? AND deleted_at IS NULL", set_clauses.join(", "));
    let params_ref: Vec<&dyn rusqlite::types::ToSql> = bind_values.iter().map(|b| b.as_ref()).collect();
    db.conn.execute(&sql, params_ref.as_slice()).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn tag_delete(state: State<AppState>, id: String) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Remove tag associations
    db.conn.execute("DELETE FROM record_tags WHERE tag_id = ?", [&id])
        .map_err(|e| e.to_string())?;

    // Soft delete
    db.conn.execute(
        "UPDATE tags SET deleted_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![now, now, id],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn tag_merge(state: State<AppState>, params: TagMergeParams) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Move all record_tags from source to target
    db.conn.execute(
        "UPDATE OR IGNORE record_tags SET tag_id = ? WHERE tag_id = ?",
        rusqlite::params![params.target_id, params.source_id],
    ).map_err(|e| e.to_string())?;

    // Remove remaining source tag associations (duplicates that couldn't be updated)
    db.conn.execute("DELETE FROM record_tags WHERE tag_id = ?", [&params.source_id])
        .map_err(|e| e.to_string())?;

    // Soft delete source tag
    db.conn.execute(
        "UPDATE tags SET deleted_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![now, now, params.source_id],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}
