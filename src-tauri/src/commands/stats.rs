use serde::Serialize;
use tauri::State;
use crate::AppState;
use crate::error::ApiResponse;

#[derive(Serialize)]
pub struct DashboardStats {
    pub total_records: i64,
    pub total_folders: i64,
    pub total_tags: i64,
    pub total_pending: i64,
    pub favorites_count: i64,
    pub high_risk_count: i64,
    pub expiring_soon_count: i64,
    pub type_distribution: Vec<TypeCount>,
    pub folder_distribution: Vec<FolderCount>,
    pub recent_activity: Vec<ActivityItem>,
}

#[derive(Serialize)]
pub struct TypeCount {
    pub record_type: String,
    pub count: i64,
}

#[derive(Serialize)]
pub struct FolderCount {
    pub folder_name: String,
    pub count: i64,
}

#[derive(Serialize)]
pub struct ActivityItem {
    pub record_id: String,
    pub action: String,
    pub created_at: String,
}

#[tauri::command]
pub fn stats_get_dashboard(state: State<AppState>) -> Result<ApiResponse<DashboardStats>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let total_records: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM records WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let total_folders: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM folders WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let total_tags: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM tags WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let total_pending: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM pending_raw_items WHERE deleted_at IS NULL AND status = 'pending'", [], |row| row.get(0))
        .unwrap_or(0);

    let favorites_count: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM records WHERE is_favorite = 1 AND deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let high_risk_count: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM records WHERE is_high_risk = 1 AND deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let expiring_soon_count: i64 = db.conn
        .query_row(
            "SELECT COUNT(*) FROM records WHERE expire_at IS NOT NULL AND expire_at <= datetime('now', '+30 days') AND expire_at > datetime('now') AND deleted_at IS NULL",
            [], |row| row.get(0),
        )
        .unwrap_or(0);

    // Type distribution
    let mut stmt = db.conn.prepare(
        "SELECT type, COUNT(*) as cnt FROM records WHERE deleted_at IS NULL GROUP BY type ORDER BY cnt DESC"
    ).map_err(|e| e.to_string())?;

    let type_distribution: Vec<TypeCount> = stmt
        .query_map([], |row| {
            Ok(TypeCount {
                record_type: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Folder distribution
    let mut stmt = db.conn.prepare(
        "SELECT COALESCE(f.name, '未分类'), COUNT(*) as cnt
         FROM records r
         LEFT JOIN folders f ON r.folder_id = f.id
         WHERE r.deleted_at IS NULL
         GROUP BY r.folder_id
         ORDER BY cnt DESC"
    ).map_err(|e| e.to_string())?;

    let folder_distribution: Vec<FolderCount> = stmt
        .query_map([], |row| {
            Ok(FolderCount {
                folder_name: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Recent activity
    let mut stmt = db.conn.prepare(
        "SELECT record_id, action, created_at FROM usage_logs ORDER BY created_at DESC LIMIT 20"
    ).map_err(|e| e.to_string())?;

    let recent_activity: Vec<ActivityItem> = stmt
        .query_map([], |row| {
            Ok(ActivityItem {
                record_id: row.get(0)?,
                action: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ApiResponse::ok(DashboardStats {
        total_records,
        total_folders,
        total_tags,
        total_pending,
        favorites_count,
        high_risk_count,
        expiring_soon_count,
        type_distribution,
        folder_distribution,
        recent_activity,
    }))
}
