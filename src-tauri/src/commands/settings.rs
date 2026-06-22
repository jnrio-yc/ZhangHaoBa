use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;
use crate::error::ApiResponse;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct SettingItem {
    pub key: String,
    pub value: Option<String>,
    pub value_type: String,
}

#[derive(Deserialize)]
pub struct SettingUpdateParams {
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub fn settings_get_all(state: State<AppState>) -> Result<ApiResponse<HashMap<String, String>>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db.conn.prepare(
        "SELECT key, value FROM app_settings"
    ).map_err(|e| e.to_string())?;

    let mut settings = HashMap::new();
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
    }).map_err(|e| e.to_string())?;

    for row in rows {
        if let Ok((key, value)) = row {
            settings.insert(key, value.unwrap_or_default());
        }
    }

    Ok(ApiResponse::ok(settings))
}

#[tauri::command]
pub fn settings_update(state: State<AppState>, params: SettingUpdateParams) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value, value_type, updated_at)
         VALUES (?, ?, COALESCE((SELECT value_type FROM app_settings WHERE key = ?), 'string'), ?)",
        rusqlite::params![params.key, params.value, params.key, now],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn settings_reset(state: State<AppState>) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let defaults = vec![
        ("default_page", "all_records"),
        ("default_sort", "smart"),
        ("theme", "light"),
        ("language", "zh-CN"),
        ("strict_mode_enabled", "false"),
        ("hide_sensitive_by_default", "true"),
        ("warn_before_copy_high_risk", "true"),
        ("clear_clipboard_after_copy", "false"),
        ("clipboard_clear_seconds", "60"),
        ("auto_backup_enabled", "false"),
        ("backup_retention_count", "7"),
        ("default_export_format", "excel"),
        ("include_sensitive_in_export_by_default", "false"),
    ];

    for (key, value) in defaults {
        db.conn.execute(
            "UPDATE app_settings SET value = ?, updated_at = ? WHERE key = ?",
            rusqlite::params![value, now, key],
        ).map_err(|e| e.to_string())?;
    }

    Ok(ApiResponse::ok(true))
}
