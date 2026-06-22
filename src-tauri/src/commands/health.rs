use serde::Serialize;
use tauri::State;
use crate::AppState;
use crate::crypto::Crypto;
use crate::error::ApiResponse;

#[derive(Serialize)]
pub struct HealthCheckResult {
    pub issues: Vec<HealthIssue>,
    pub total_issues: i64,
    pub critical_count: i64,
    pub warning_count: i64,
    pub info_count: i64,
}

#[derive(Serialize)]
pub struct HealthIssue {
    pub id: String,
    pub record_id: Option<String>,
    pub issue_type: String,
    pub issue_level: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[tauri::command]
pub fn health_run_check(state: State<AppState>) -> Result<ApiResponse<HealthCheckResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Clear old check results
    db.conn.execute("DELETE FROM health_check_results WHERE status = 'open'", [])
        .map_err(|e| e.to_string())?;

    let mut issues = Vec::new();

    // Check 1: Records without passwords (website accounts)
    let mut stmt = db.conn.prepare(
        "SELECT id, title FROM records WHERE type = 'website_account' AND password_encrypted IS NULL AND deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;

    let empty_password_records: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for (record_id, title) in &empty_password_records {
        let id = uuid::Uuid::new_v4().to_string();
        let fingerprint = format!("empty_password:{}", record_id);

        // Check if ignored
        let ignored: bool = db.conn
            .query_row("SELECT COUNT(*) FROM ignored_health_issues WHERE fingerprint = ?", [&fingerprint], |row| row.get::<_, i64>(0))
            .map(|c| c > 0)
            .unwrap_or(false);

        if !ignored {
            db.conn.execute(
                "INSERT INTO health_check_results (id, record_id, issue_type, issue_level, title, description, status, created_at)
                 VALUES (?, ?, 'empty_password', 'warning', ?, ?, 'open', ?)",
                rusqlite::params![id, record_id, format!("\"{}\" 未设置密码", title), "网站账号建议设置密码", now],
            ).ok();

            issues.push(HealthIssue {
                id: id.clone(),
                record_id: Some(record_id.clone()),
                issue_type: "empty_password".to_string(),
                issue_level: "warning".to_string(),
                title: format!("\"{}\" 未设置密码", title),
                description: Some("网站账号建议设置密码".to_string()),
                status: "open".to_string(),
                created_at: now.clone(),
            });
        }
    }

    // Check 2: Expiring records
    let mut stmt = db.conn.prepare(
        "SELECT id, title, expire_at FROM records WHERE expire_at IS NOT NULL AND expire_at <= datetime('now', '+30 days') AND expire_at > datetime('now') AND deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;

    let expiring_records: Vec<(String, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for (record_id, title, expire_at) in &expiring_records {
        let id = uuid::Uuid::new_v4().to_string();
        issues.push(HealthIssue {
            id: id.clone(),
            record_id: Some(record_id.clone()),
            issue_type: "expiring_soon".to_string(),
            issue_level: "warning".to_string(),
            title: format!("\"{}\" 即将过期", title),
            description: Some(format!("过期时间: {}", expire_at)),
            status: "open".to_string(),
            created_at: now.clone(),
        });

        db.conn.execute(
            "INSERT INTO health_check_results (id, record_id, issue_type, issue_level, title, description, status, created_at)
             VALUES (?, ?, 'expiring_soon', 'warning', ?, ?, 'open', ?)",
            rusqlite::params![id, record_id, format!("\"{}\" 即将过期", title), format!("过期时间: {}", expire_at), now],
        ).ok();
    }

    // Check 3: Expired records
    let mut stmt = db.conn.prepare(
        "SELECT id, title, expire_at FROM records WHERE expire_at IS NOT NULL AND expire_at <= datetime('now') AND deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;

    let expired_records: Vec<(String, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for (record_id, title, expire_at) in &expired_records {
        let id = uuid::Uuid::new_v4().to_string();
        issues.push(HealthIssue {
            id: id.clone(),
            record_id: Some(record_id.clone()),
            issue_type: "expired".to_string(),
            issue_level: "critical".to_string(),
            title: format!("\"{}\" 已过期", title),
            description: Some(format!("过期时间: {}", expire_at)),
            status: "open".to_string(),
            created_at: now.clone(),
        });

        db.conn.execute(
            "INSERT INTO health_check_results (id, record_id, issue_type, issue_level, title, description, status, created_at)
             VALUES (?, ?, 'expired', 'critical', ?, ?, 'open', ?)",
            rusqlite::params![id, record_id, format!("\"{}\" 已过期", title), format!("过期时间: {}", expire_at), now],
        ).ok();
    }

    let critical_count = issues.iter().filter(|i| i.issue_level == "critical").count() as i64;
    let warning_count = issues.iter().filter(|i| i.issue_level == "warning").count() as i64;
    let info_count = issues.iter().filter(|i| i.issue_level == "info").count() as i64;

    Ok(ApiResponse::ok(HealthCheckResult {
        total_issues: issues.len() as i64,
        critical_count,
        warning_count,
        info_count,
        issues,
    }))
}

#[tauri::command]
pub fn health_ignore_issue(state: State<AppState>, issue_id: String, reason: Option<String>) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Get issue details
    let (issue_type, record_id): (String, Option<String>) = db.conn.query_row(
        "SELECT issue_type, record_id FROM health_check_results WHERE id = ?",
        [&issue_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|_| "健康检查项不存在".to_string())?;

    let fingerprint = format!("{}:{}", issue_type, record_id.as_deref().unwrap_or("global"));
    let id = uuid::Uuid::new_v4().to_string();

    db.conn.execute(
        "INSERT OR IGNORE INTO ignored_health_issues (id, issue_type, record_id, fingerprint, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?)",
        rusqlite::params![id, issue_type, record_id, fingerprint, reason, now],
    ).map_err(|e| e.to_string())?;

    db.conn.execute(
        "UPDATE health_check_results SET status = 'ignored', ignored_at = ? WHERE id = ?",
        rusqlite::params![now, issue_id],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn health_resolve_issue(state: State<AppState>, issue_id: String) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "UPDATE health_check_results SET status = 'resolved', resolved_at = ? WHERE id = ?",
        rusqlite::params![now, issue_id],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}
