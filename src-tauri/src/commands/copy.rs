use crate::crypto::Crypto;
use crate::error::ApiResponse;
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyFieldParams {
    pub record_id: String,
    pub field_key: String,
    pub entry_id: Option<String>,
    pub custom_field_id: Option<String>,
    pub require_risk_confirmed: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyResult {
    pub success: bool,
    pub field_key: String,
    pub is_sensitive: bool,
    pub auto_clear_seconds: Option<i64>,
}

fn normalize_field_key(field_key: &str) -> &str {
    match field_key {
        "apiKey" => "api_key",
        "apiKeyGroup" => "api_key_group",
        "baseUrl" => "base_url",
        "licenseKey" => "license_key",
        other => other,
    }
}

#[tauri::command]
pub fn copy_field(
    state: State<AppState>,
    app_handle: tauri::AppHandle,
    payload: CopyFieldParams,
) -> Result<ApiResponse<CopyResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let record_id = payload.record_id;
    let field_key = normalize_field_key(&payload.field_key).to_string();

    let mut is_sensitive = matches!(field_key.as_str(), "password" | "api_key" | "license_key");

    let value =
        if field_key == "api_key_group" {
            is_sensitive = true;
            payload.custom_field_id.as_deref().and_then(|group_id| {
                let encrypted: Option<String> = db
                    .conn
                    .query_row(
                        "SELECT api_key_encrypted FROM api_key_groups
                         WHERE id = ? AND record_id = ? AND deleted_at IS NULL",
                        rusqlite::params![group_id, record_id],
                        |row| row.get(0),
                    )
                    .ok()
                    .flatten();
                encrypted.and_then(|value| Crypto::decrypt(&value).ok())
            })
        } else if let Some(custom_field_id) = payload.custom_field_id.as_deref() {
            let custom_field: Option<(Option<String>, Option<String>, i32)> = db
                .conn
                .query_row(
                    "SELECT value, encrypted_value, is_sensitive
             FROM custom_fields
             WHERE id = ? AND record_id = ? AND deleted_at IS NULL",
                    rusqlite::params![custom_field_id, record_id],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                )
                .ok();

            custom_field.and_then(|(plain, encrypted, sensitive)| {
                is_sensitive = sensitive != 0;
                if is_sensitive {
                    encrypted.and_then(|value| Crypto::decrypt(&value).ok())
                } else {
                    plain
                }
            })
        } else if let Some(entry_id) = payload.entry_id.as_deref() {
            match field_key.as_str() {
                "url" => db
                    .conn
                    .query_row(
                        "SELECT url FROM environment_entries
                 WHERE id = ? AND record_id = ? AND deleted_at IS NULL",
                        rusqlite::params![entry_id, record_id],
                        |row| row.get::<_, Option<String>>(0),
                    )
                    .ok()
                    .flatten(),
                "username" => db
                    .conn
                    .query_row(
                        "SELECT username FROM environment_entries
                 WHERE id = ? AND record_id = ? AND deleted_at IS NULL",
                        rusqlite::params![entry_id, record_id],
                        |row| row.get::<_, Option<String>>(0),
                    )
                    .ok()
                    .flatten(),
                "password" => {
                    is_sensitive = true;
                    let encrypted: Option<String> = db
                        .conn
                        .query_row(
                            "SELECT password_encrypted FROM environment_entries
                     WHERE id = ? AND record_id = ? AND deleted_at IS NULL",
                            rusqlite::params![entry_id, record_id],
                            |row| row.get(0),
                        )
                        .ok()
                        .flatten();
                    encrypted.and_then(|value| Crypto::decrypt(&value).ok())
                }
                _ => None,
            }
        } else {
            match field_key.as_str() {
                "username" => db
                    .conn
                    .query_row(
                        "SELECT username FROM records WHERE id = ? AND deleted_at IS NULL",
                        [&record_id],
                        |row| row.get::<_, Option<String>>(0),
                    )
                    .map_err(|e| e.to_string())?,
                "url" => db
                    .conn
                    .query_row(
                        "SELECT url FROM records WHERE id = ? AND deleted_at IS NULL",
                        [&record_id],
                        |row| row.get::<_, Option<String>>(0),
                    )
                    .map_err(|e| e.to_string())?,
                "base_url" => db
                    .conn
                    .query_row(
                        "SELECT base_url FROM records WHERE id = ? AND deleted_at IS NULL",
                        [&record_id],
                        |row| row.get::<_, Option<String>>(0),
                    )
                    .map_err(|e| e.to_string())?,
                "password" => {
                    let encrypted: Option<String> = db.conn.query_row(
                "SELECT password_encrypted FROM records WHERE id = ? AND deleted_at IS NULL",
                [&record_id], |row| row.get(0),
            ).map_err(|e| e.to_string())?;
                    encrypted
                        .map(|enc| Crypto::decrypt(&enc))
                        .transpose()
                        .map_err(|e| e)?
                }
                "api_key" => {
                    let encrypted: Option<String> = db.conn.query_row(
                "SELECT api_key_encrypted FROM records WHERE id = ? AND deleted_at IS NULL",
                [&record_id], |row| row.get(0),
            ).map_err(|e| e.to_string())?;
                    encrypted
                        .map(|enc| Crypto::decrypt(&enc))
                        .transpose()
                        .map_err(|e| e)?
                }
                "license_key" => {
                    let encrypted: Option<String> = db.conn.query_row(
                "SELECT license_key_encrypted FROM records WHERE id = ? AND deleted_at IS NULL",
                [&record_id], |row| row.get(0),
            ).map_err(|e| e.to_string())?;
                    encrypted
                        .map(|enc| Crypto::decrypt(&enc))
                        .transpose()
                        .map_err(|e| e)?
                }
                "env" | "json" => {
                    let row = db
                        .conn
                        .query_row(
                            "SELECT title, url, base_url, username, password_encrypted,
                        api_key_encrypted, license_key_encrypted
                 FROM records WHERE id = ? AND deleted_at IS NULL",
                            [&record_id],
                            |row| {
                                Ok((
                                    row.get::<_, String>(0)?,
                                    row.get::<_, Option<String>>(1)?,
                                    row.get::<_, Option<String>>(2)?,
                                    row.get::<_, Option<String>>(3)?,
                                    row.get::<_, Option<String>>(4)?,
                                    row.get::<_, Option<String>>(5)?,
                                    row.get::<_, Option<String>>(6)?,
                                ))
                            },
                        )
                        .map_err(|e| e.to_string())?;

                    let password = row
                        .4
                        .as_deref()
                        .map(Crypto::decrypt)
                        .transpose()
                        .map_err(|e| e)?;
                    let api_key = row
                        .5
                        .as_deref()
                        .map(Crypto::decrypt)
                        .transpose()
                        .map_err(|e| e)?;
                    let license_key = row
                        .6
                        .as_deref()
                        .map(Crypto::decrypt)
                        .transpose()
                        .map_err(|e| e)?;
                    is_sensitive = password.is_some() || api_key.is_some() || license_key.is_some();

                    if field_key == "env" {
                        let mut lines = Vec::new();
                        if let Some(value) = row.2 {
                            lines.push(format!("BASE_URL={}", value));
                        }
                        if let Some(value) = row.1 {
                            lines.push(format!("URL={}", value));
                        }
                        if let Some(value) = row.3 {
                            lines.push(format!("USERNAME={}", value));
                        }
                        if let Some(value) = password {
                            lines.push(format!("PASSWORD={}", value));
                        }
                        if let Some(value) = api_key {
                            lines.push(format!("API_KEY={}", value));
                        }
                        if let Some(value) = license_key {
                            lines.push(format!("LICENSE_KEY={}", value));
                        }
                        Some(lines.join("\n"))
                    } else {
                        Some(
                            serde_json::json!({
                                "title": row.0,
                                "url": row.1,
                                "baseUrl": row.2,
                                "username": row.3,
                                "password": password,
                                "apiKey": api_key,
                                "licenseKey": license_key,
                            })
                            .to_string(),
                        )
                    }
                }
                _ => None,
            }
        };

    if let Some(text) = value.filter(|text| !text.is_empty()) {
        app_handle
            .clipboard_manager()
            .write_text(&text)
            .map_err(|e| format!("Clipboard write failed: {}", e))?;

        // Log usage
        let log_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
        db.conn.execute(
            "INSERT INTO usage_logs (id, record_id, action, field_key, is_sensitive_action, created_at)
             VALUES (?, ?, 'copy_field', ?, ?, ?)",
            rusqlite::params![log_id, record_id, field_key, is_sensitive as i32, now],
        ).ok();

        // Update last_used_at
        db.conn
            .execute(
                "UPDATE records SET last_used_at = ? WHERE id = ?",
                rusqlite::params![now, record_id],
            )
            .ok();

        // Check auto-clear setting
        let auto_clear: Option<String> = db
            .conn
            .query_row(
                "SELECT value FROM app_settings WHERE key = 'clear_clipboard_after_copy'",
                [],
                |row| row.get(0),
            )
            .ok();
        let clear_seconds: Option<i64> = if auto_clear.as_deref() == Some("true") && is_sensitive {
            db.conn
                .query_row(
                    "SELECT value FROM app_settings WHERE key = 'clipboard_clear_seconds'",
                    [],
                    |row| row.get::<_, String>(0),
                )
                .ok()
                .and_then(|v| v.parse().ok())
        } else {
            None
        };

        Ok(ApiResponse::ok(CopyResult {
            success: true,
            field_key: payload.field_key,
            is_sensitive,
            auto_clear_seconds: clear_seconds,
        }))
    } else {
        Ok(ApiResponse::err("FIELD_EMPTY", "字段为空，无内容可复制"))
    }
}

#[cfg(test)]
mod tests {
    use super::{normalize_field_key, CopyFieldParams};

    #[test]
    fn normalizes_frontend_field_keys() {
        assert_eq!(normalize_field_key("apiKey"), "api_key");
        assert_eq!(normalize_field_key("baseUrl"), "base_url");
        assert_eq!(normalize_field_key("licenseKey"), "license_key");
        assert_eq!(normalize_field_key("url"), "url");
    }

    #[test]
    fn copy_field_payload_accepts_camel_case() {
        let payload: CopyFieldParams = serde_json::from_value(serde_json::json!({
            "recordId": "record-1",
            "fieldKey": "apiKey",
            "entryId": null,
            "customFieldId": null,
            "requireRiskConfirmed": false
        }))
        .expect("camelCase payload should deserialize");

        assert_eq!(payload.record_id, "record-1");
        assert_eq!(payload.field_key, "apiKey");
        assert_eq!(payload.require_risk_confirmed, Some(false));
    }
}

use tauri::ClipboardManager;

#[tauri::command]
pub fn copy_template(
    state: State<AppState>,
    app_handle: tauri::AppHandle,
    record_id: String,
    template_id: String,
) -> Result<ApiResponse<CopyResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let template_content: String = db.conn.query_row(
        "SELECT template_content FROM copy_templates WHERE id = ? AND deleted_at IS NULL AND is_enabled = 1",
        [&template_id],
        |row| row.get(0),
    ).map_err(|_| "模板不存在或已禁用".to_string())?;

    let contains_sensitive: bool = db
        .conn
        .query_row(
            "SELECT contains_sensitive FROM copy_templates WHERE id = ?",
            [&template_id],
            |row| row.get::<_, i32>(0),
        )
        .map(|v| v != 0)
        .unwrap_or(false);

    // Get record data
    let row = db
        .conn
        .query_row(
            "SELECT title, url, base_url, username, password_encrypted, api_key_encrypted,
                license_key_encrypted, note, expire_at, platform_name, project_name,
                environment_name
         FROM records WHERE id = ? AND deleted_at IS NULL",
            [&record_id],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, Option<String>>(8)?,
                    row.get::<_, Option<String>>(9)?,
                    row.get::<_, Option<String>>(10)?,
                    row.get::<_, Option<String>>(11)?,
                ))
            },
        )
        .map_err(|_| "记录不存在".to_string())?;

    let password = row
        .4
        .as_ref()
        .and_then(|e| Crypto::decrypt(e).ok())
        .unwrap_or_default();
    let api_key = row
        .5
        .as_ref()
        .and_then(|e| Crypto::decrypt(e).ok())
        .unwrap_or_default();
    let license_key = row
        .6
        .as_ref()
        .and_then(|e| Crypto::decrypt(e).ok())
        .unwrap_or_default();

    // Get default model
    let default_model: String = db.conn.query_row(
        "SELECT model_name FROM record_models WHERE record_id = ? AND is_default = 1 AND deleted_at IS NULL LIMIT 1",
        [&record_id],
        |row| row.get(0),
    ).unwrap_or_default();

    let result = template_content
        .replace("{title}", row.0.as_deref().unwrap_or(""))
        .replace("{url}", row.1.as_deref().unwrap_or(""))
        .replace("{base_url}", row.2.as_deref().unwrap_or(""))
        .replace("{username}", row.3.as_deref().unwrap_or(""))
        .replace("{password}", &password)
        .replace("{api_key}", &api_key)
        .replace("{license_key}", &license_key)
        .replace("{note}", row.7.as_deref().unwrap_or(""))
        .replace("{expire_at}", row.8.as_deref().unwrap_or(""))
        .replace("{platform_name}", row.9.as_deref().unwrap_or(""))
        .replace("{project_name}", row.10.as_deref().unwrap_or(""))
        .replace("{environment_name}", row.11.as_deref().unwrap_or(""))
        .replace("{default_model}", &default_model);

    app_handle
        .clipboard_manager()
        .write_text(&result)
        .map_err(|e| format!("Clipboard write failed: {}", e))?;

    Ok(ApiResponse::ok(CopyResult {
        success: true,
        field_key: "template".to_string(),
        is_sensitive: contains_sensitive,
        auto_clear_seconds: None,
    }))
}

#[tauri::command]
pub fn copy_clear_clipboard_if_matched(
    app_handle: tauri::AppHandle,
    expected_hash: String,
) -> Result<ApiResponse<bool>, String> {
    if let Ok(current) = app_handle.clipboard_manager().read_text() {
        if let Some(text) = current {
            let current_hash = Crypto::sha256_hash(&text);
            if current_hash == expected_hash {
                app_handle
                    .clipboard_manager()
                    .write_text("")
                    .map_err(|e| format!("Clear clipboard failed: {}", e))?;
                return Ok(ApiResponse::ok(true));
            }
        }
    }
    Ok(ApiResponse::ok(false))
}
