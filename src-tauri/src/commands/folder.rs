use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;
use crate::error::ApiResponse;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderItem {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: i32,
    pub is_common: bool,
    pub is_archived: bool,
    pub record_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderCreateParams {
    pub name: String,
    pub parent_id: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderUpdateParams {
    pub id: String,
    pub name: Option<String>,
    pub parent_id: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: Option<i32>,
    pub is_common: Option<bool>,
    pub is_archived: Option<bool>,
}

#[tauri::command]
pub fn folder_list(state: State<AppState>) -> Result<ApiResponse<Vec<FolderItem>>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db.conn.prepare(
        "SELECT f.id, f.parent_id, f.name, f.icon, f.color, f.sort_order,
                f.is_common, f.is_archived, f.created_at, f.updated_at,
                (SELECT COUNT(*) FROM records r WHERE r.folder_id = f.id AND r.deleted_at IS NULL) as record_count
         FROM folders f
         WHERE f.deleted_at IS NULL
         ORDER BY f.sort_order ASC, f.name ASC"
    ).map_err(|e| e.to_string())?;

    let items: Vec<FolderItem> = stmt
        .query_map([], |row| {
            Ok(FolderItem {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                icon: row.get(3)?,
                color: row.get(4)?,
                sort_order: row.get(5)?,
                is_common: row.get::<_, i32>(6)? != 0,
                is_archived: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                record_count: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ApiResponse::ok(items))
}

#[tauri::command]
pub fn folder_create(state: State<AppState>, params: FolderCreateParams) -> Result<ApiResponse<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Check duplicate name
    let exists: bool = db.conn
        .query_row(
            "SELECT COUNT(*) FROM folders WHERE name = ? AND parent_id IS ? AND deleted_at IS NULL",
            rusqlite::params![params.name, params.parent_id],
            |row| row.get::<_, i64>(0),
        )
        .map(|c| c > 0)
        .unwrap_or(false);

    if exists {
        return Ok(ApiResponse::err("DUPLICATE_NAME", "同级目录下已存在同名文件夹"));
    }

    let max_sort: i32 = db.conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) FROM folders WHERE parent_id IS ? AND deleted_at IS NULL",
            rusqlite::params![params.parent_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    db.conn.execute(
        "INSERT INTO folders (id, parent_id, name, icon, color, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![id, params.parent_id, params.name, params.icon, params.color, max_sort + 10, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(id))
}

#[tauri::command]
pub fn folder_update(state: State<AppState>, params: FolderUpdateParams) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let mut set_clauses = vec!["updated_at = ?".to_string()];
    let mut bind_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];

    if let Some(ref name) = params.name {
        set_clauses.push("name = ?".to_string());
        bind_values.push(Box::new(name.clone()));
    }
    if let Some(ref icon) = params.icon {
        set_clauses.push("icon = ?".to_string());
        bind_values.push(Box::new(icon.clone()));
    }
    if let Some(ref color) = params.color {
        set_clauses.push("color = ?".to_string());
        bind_values.push(Box::new(color.clone()));
    }
    if let Some(sort_order) = params.sort_order {
        set_clauses.push("sort_order = ?".to_string());
        bind_values.push(Box::new(sort_order));
    }
    if let Some(is_common) = params.is_common {
        set_clauses.push("is_common = ?".to_string());
        bind_values.push(Box::new(is_common as i32));
    }
    if let Some(is_archived) = params.is_archived {
        set_clauses.push("is_archived = ?".to_string());
        bind_values.push(Box::new(is_archived as i32));
    }

    bind_values.push(Box::new(params.id.clone()));

    let sql = format!("UPDATE folders SET {} WHERE id = ? AND deleted_at IS NULL", set_clauses.join(", "));
    let params_ref: Vec<&dyn rusqlite::types::ToSql> = bind_values.iter().map(|b| b.as_ref()).collect();
    db.conn.execute(&sql, params_ref.as_slice()).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn folder_delete(state: State<AppState>, id: String) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Move records in this folder to no folder
    db.conn.execute(
        "UPDATE records SET folder_id = NULL, updated_at = ? WHERE folder_id = ? AND deleted_at IS NULL",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;

    // Soft delete the folder
    db.conn.execute(
        "UPDATE folders SET deleted_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![now, now, id],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}
