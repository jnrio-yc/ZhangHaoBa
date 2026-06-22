use serde::Serialize;
use tauri::State;
use crate::AppState;
use crate::crypto::Crypto;
use crate::error::ApiResponse;

#[derive(Serialize)]
pub struct RevealResult {
    pub value: String,
    pub field_key: String,
}

#[tauri::command]
pub fn security_reveal_secret(
    state: State<AppState>,
    record_id: String,
    field_key: String,
) -> Result<ApiResponse<RevealResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let column = match field_key.as_str() {
        "password" => "password_encrypted",
        "api_key" => "api_key_encrypted",
        "license_key" => "license_key_encrypted",
        _ => return Ok(ApiResponse::err("INVALID_FIELD", "无效的敏感字段")),
    };

    let sql = format!("SELECT {} FROM records WHERE id = ? AND deleted_at IS NULL", column);
    let encrypted: Option<String> = db.conn
        .query_row(&sql, [&record_id], |row| row.get(0))
        .map_err(|_| "记录不存在".to_string())?;

    match encrypted {
        Some(enc) => {
            let decrypted = Crypto::decrypt(&enc).map_err(|e| e)?;

            // Log the reveal action
            let log_id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
            db.conn.execute(
                "INSERT INTO usage_logs (id, record_id, action, field_key, is_sensitive_action, created_at)
                 VALUES (?, ?, 'reveal_secret', ?, 1, ?)",
                rusqlite::params![log_id, record_id, field_key, now],
            ).ok();

            Ok(ApiResponse::ok(RevealResult {
                value: decrypted,
                field_key,
            }))
        }
        None => Ok(ApiResponse::err("FIELD_EMPTY", "该字段未设置")),
    }
}

#[tauri::command]
pub fn security_set_master_password(
    state: State<AppState>,
    password: String,
) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let hash = Crypto::hash_master_password(&password).map_err(|e| e)?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value, value_type, updated_at) VALUES ('master_password_hash', ?, 'string', ?)",
        rusqlite::params![hash, now],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn security_verify_master_password(
    state: State<AppState>,
    password: String,
) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let hash: Option<String> = db.conn
        .query_row("SELECT value FROM app_settings WHERE key = 'master_password_hash'", [], |row| row.get(0))
        .ok();

    match hash {
        Some(h) => {
            let valid = Crypto::verify_master_password(&password, &h).map_err(|e| e)?;
            Ok(ApiResponse::ok(valid))
        }
        None => Ok(ApiResponse::err("NO_MASTER_PASSWORD", "尚未设置主密码")),
    }
}

#[tauri::command]
pub fn security_set_strict_mode(
    state: State<AppState>,
    enabled: bool,
) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value, value_type, updated_at) VALUES ('strict_mode_enabled', ?, 'boolean', ?)",
        rusqlite::params![if enabled { "true" } else { "false" }, now],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn security_lock() -> Result<ApiResponse<bool>, String> {
    // In a full implementation, this would set an in-memory lock state
    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn security_unlock(
    state: State<AppState>,
    password: String,
) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let hash: Option<String> = db.conn
        .query_row("SELECT value FROM app_settings WHERE key = 'master_password_hash'", [], |row| row.get(0))
        .ok();

    match hash {
        Some(h) => {
            let valid = Crypto::verify_master_password(&password, &h).map_err(|e| e)?;
            Ok(ApiResponse::ok(valid))
        }
        None => Ok(ApiResponse::ok(true)), // No password set, always unlocked
    }
}
