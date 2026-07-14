use serde::Serialize;
use tauri::State;
use crate::AppState;
use crate::error::ApiResponse;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeCount {
    pub r#type: String,
    pub count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub total_records: i64,
    pub api_relay_count: i64,
    pub api_official_count: i64,
    pub test_environment_count: i64,
    pub website_account_count: i64,
    pub license_key_count: i64,
    pub common_link_count: i64,
    pub pending_count: i64,
    pub expiring_count: i64,
    pub high_risk_count: i64,
    pub type_counts: Vec<TypeCount>,
}

fn count_by_type(conn: &rusqlite::Connection, record_type: &str) -> i64 {
    conn.query_row(
        "SELECT COUNT(*) FROM records WHERE type = ? AND deleted_at IS NULL",
        [record_type],
        |row| row.get(0),
    )
    .unwrap_or(0)
}

#[tauri::command]
pub fn stats_get_dashboard(state: State<AppState>) -> Result<ApiResponse<DashboardStats>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let total_records: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM records WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let api_relay_count = count_by_type(&db.conn, "api_relay");
    let api_official_count = count_by_type(&db.conn, "api_official");
    let test_environment_count = count_by_type(&db.conn, "test_environment");
    let website_account_count = count_by_type(&db.conn, "website_account");
    let license_key_count = count_by_type(&db.conn, "license_key");
    let common_link_count = count_by_type(&db.conn, "common_link");

    let pending_count: i64 = db.conn
        .query_row(
            "SELECT COUNT(*) FROM pending_raw_items WHERE deleted_at IS NULL AND status = 'pending'",
            [], |row| row.get(0),
        )
        .unwrap_or(0);

    let high_risk_count: i64 = db.conn
        .query_row("SELECT COUNT(*) FROM records WHERE is_high_risk = 1 AND deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let expiring_count: i64 = db.conn
        .query_row(
            "SELECT COUNT(*) FROM records WHERE expire_at IS NOT NULL AND expire_at <= datetime('now', '+30 days') AND expire_at > datetime('now') AND deleted_at IS NULL",
            [], |row| row.get(0),
        )
        .unwrap_or(0);

    let mut stmt = db.conn.prepare(
        "SELECT type, COUNT(*) as cnt FROM records WHERE deleted_at IS NULL GROUP BY type ORDER BY cnt DESC"
    ).map_err(|e| e.to_string())?;

    let type_counts: Vec<TypeCount> = stmt
        .query_map([], |row| {
            Ok(TypeCount {
                r#type: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ApiResponse::ok(DashboardStats {
        total_records,
        api_relay_count,
        api_official_count,
        test_environment_count,
        website_account_count,
        license_key_count,
        common_link_count,
        pending_count,
        expiring_count,
        high_risk_count,
        type_counts,
    }))
}
