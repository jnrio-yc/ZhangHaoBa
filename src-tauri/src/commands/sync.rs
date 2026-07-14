use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use tauri::State;

use crate::crypto::Crypto;
use crate::error::ApiResponse;
use crate::AppState;

/// Tables that participate in cloud sync, in FK-safe apply order
/// (parents before children). `record_tags` is intentionally absent:
/// its rows are carried as a `tag_ids` array embedded in each `records`
/// row and fully replaced on apply, mirroring how the app itself
/// already rewrites tag associations on every record save.
const SYNC_TABLES: &[&str] = &[
    "folders",
    "tags",
    "records",
    "custom_fields",
    "environment_entries",
    "record_models",
    "api_key_groups",
];

fn columns_for(table: &str) -> &'static [&'static str] {
    match table {
        "folders" => &[
            "id", "parent_id", "name", "icon", "color", "sort_order",
            "is_common", "is_archived", "created_at", "updated_at", "deleted_at",
        ],
        "tags" => &[
            "id", "name", "color", "group_key", "sort_order",
            "is_system", "created_at", "updated_at", "deleted_at",
        ],
        "records" => &[
            "id", "title", "type", "folder_id", "status", "url", "base_url", "username",
            "password_encrypted", "api_key_encrypted", "license_key_encrypted", "note",
            "expire_at", "price_info", "platform_name", "project_name", "environment_name",
            "environment_type", "is_favorite", "is_common", "is_high_risk", "is_production",
            "is_verified", "is_paid", "sort_order", "created_at", "updated_at", "last_used_at",
            "deleted_at", "archived_at", "source", "sync_status", "version",
        ],
        "custom_fields" => &[
            "id", "record_id", "name", "field_key", "field_type", "value", "encrypted_value",
            "is_sensitive", "is_searchable", "is_copyable", "is_visible_in_list", "is_exportable",
            "group_name", "description", "sort_order", "created_at", "updated_at", "deleted_at",
        ],
        "environment_entries" => &[
            "id", "record_id", "entry_name", "entry_type", "url", "role", "username",
            "password_encrypted", "verification_note", "login_steps", "note", "sort_order",
            "is_primary", "is_high_risk", "created_at", "updated_at", "deleted_at",
        ],
        "record_models" => &[
            "id", "record_id", "model_name", "model_type", "is_default", "is_favorite",
            "note", "sort_order", "created_at", "updated_at", "deleted_at",
        ],
        "api_key_groups" => &[
            "id", "record_id", "group_name", "api_key_encrypted", "balance", "models_json",
            "sort_order", "created_at", "updated_at", "deleted_at",
        ],
        _ => &[],
    }
}

fn is_bool_column(col: &str) -> bool {
    col.starts_with("is_")
}

fn sql_value_to_json(row: &rusqlite::Row, idx: usize, col: &str) -> rusqlite::Result<Value> {
    use rusqlite::types::ValueRef;
    let v = row.get_ref(idx)?;
    Ok(match v {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(i) => {
            if is_bool_column(col) {
                Value::Bool(i != 0)
            } else {
                Value::Number(i.into())
            }
        }
        ValueRef::Real(f) => serde_json::Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null),
        ValueRef::Text(t) => Value::String(String::from_utf8_lossy(t).to_string()),
        ValueRef::Blob(b) => Value::String(base64_lite_encode(b)),
    })
}

// Minimal base64 fallback (no BLOB columns exist in the synced tables today,
// but this keeps the mapping total instead of panicking if one appears later).
fn base64_lite_encode(bytes: &[u8]) -> String {
    use base64::{engine::general_purpose::STANDARD, Engine};
    STANDARD.encode(bytes)
}

fn json_to_sql_value(v: &Value) -> rusqlite::types::Value {
    use rusqlite::types::Value as SqlValue;
    match v {
        Value::Null => SqlValue::Null,
        Value::Bool(b) => SqlValue::Integer(if *b { 1 } else { 0 }),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                SqlValue::Integer(i)
            } else {
                SqlValue::Real(n.as_f64().unwrap_or(0.0))
            }
        }
        Value::String(s) => SqlValue::Text(s.clone()),
        _ => SqlValue::Null,
    }
}

fn fetch_changed_rows(
    conn: &Connection,
    table: &str,
    since: Option<&str>,
) -> Result<Vec<Map<String, Value>>, String> {
    let columns = columns_for(table);
    let col_list = columns.join(", ");
    let sql = match since {
        Some(_) => format!("SELECT {col_list} FROM {table} WHERE updated_at > ?"),
        None => format!("SELECT {col_list} FROM {table}"),
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let map_row = |row: &rusqlite::Row| -> rusqlite::Result<Map<String, Value>> {
        let mut obj = Map::new();
        for (i, col) in columns.iter().enumerate() {
            obj.insert((*col).to_string(), sql_value_to_json(row, i, col)?);
        }
        Ok(obj)
    };

    let rows: Vec<Map<String, Value>> = match since {
        Some(ts) => stmt
            .query_map([ts], map_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect(),
        None => stmt
            .query_map([], map_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect(),
    };
    Ok(rows)
}

fn attach_tag_ids(conn: &Connection, records: &mut [Map<String, Value>]) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT tag_id FROM record_tags WHERE record_id = ?")
        .map_err(|e| e.to_string())?;
    for rec in records.iter_mut() {
        let record_id = rec.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
        let tag_ids: Vec<String> = stmt
            .query_map([&record_id], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        rec.insert("tag_ids".to_string(), json!(tag_ids));
    }
    Ok(())
}

#[tauri::command]
pub fn sync_get_local_changes(
    state: State<AppState>,
    since: Option<String>,
) -> Result<ApiResponse<Value>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut bundle = Map::new();

    for table in SYNC_TABLES {
        let mut rows = fetch_changed_rows(&db.conn, table, since.as_deref())?;
        if *table == "records" {
            attach_tag_ids(&db.conn, &mut rows)?;
        }
        bundle.insert((*table).to_string(), Value::Array(rows.into_iter().map(Value::Object).collect()));
    }

    Ok(ApiResponse::ok(Value::Object(bundle)))
}

fn upsert_row(conn: &Connection, table: &str, row: &Map<String, Value>) -> Result<(), String> {
    let columns = columns_for(table);
    let col_list = columns.join(", ");
    let placeholders = columns.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let update_clause = columns
        .iter()
        .filter(|c| **c != "id")
        .map(|c| format!("{c} = excluded.{c}"))
        .collect::<Vec<_>>()
        .join(", ");

    let sql = format!(
        "INSERT INTO {table} ({col_list}) VALUES ({placeholders}) \
         ON CONFLICT(id) DO UPDATE SET {update_clause} \
         WHERE excluded.updated_at > {table}.updated_at"
    );

    let values: Vec<rusqlite::types::Value> = columns
        .iter()
        .map(|c| row.get(*c).map(json_to_sql_value).unwrap_or(rusqlite::types::Value::Null))
        .collect();
    let params: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();

    conn.execute(&sql, params.as_slice()).map_err(|e| e.to_string())?;
    Ok(())
}

fn replace_record_tags(conn: &Connection, record_id: &str, tag_ids: &[String], now: &str) -> Result<(), String> {
    conn.execute("DELETE FROM record_tags WHERE record_id = ?", [record_id])
        .map_err(|e| e.to_string())?;
    for tag_id in tag_ids {
        conn.execute(
            "INSERT OR IGNORE INTO record_tags (record_id, tag_id, created_at) VALUES (?, ?, ?)",
            rusqlite::params![record_id, tag_id, now],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn sync_apply_remote_changes(state: State<AppState>, changes: Value) -> Result<ApiResponse<Value>, String> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let tx = db.conn.transaction().map_err(|e| e.to_string())?;

    let mut applied = Map::new();
    let changes_obj = changes.as_object().ok_or("invalid changes payload")?;

    for table in SYNC_TABLES {
        let Some(rows) = changes_obj.get(*table).and_then(|v| v.as_array()) else { continue };
        let mut count = 0;
        for row_val in rows {
            let Some(row) = row_val.as_object() else { continue };
            upsert_row(&tx, table, row)?;

            if *table == "records" {
                if let Some(record_id) = row.get("id").and_then(|v| v.as_str()) {
                    let tag_ids: Vec<String> = row
                        .get("tag_ids")
                        .and_then(|v| v.as_array())
                        .map(|arr| arr.iter().filter_map(|t| t.as_str().map(String::from)).collect())
                        .unwrap_or_default();
                    replace_record_tags(&tx, record_id, &tag_ids, &now)?;
                }
            }
            count += 1;
        }
        applied.insert((*table).to_string(), json!(count));
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(ApiResponse::ok(Value::Object(applied)))
}

// ── Sync configuration & session (stored in app_settings) ──────────────

const KEY_SUPABASE_URL: &str = "sync_supabase_url";
const KEY_SUPABASE_ANON_KEY: &str = "sync_supabase_anon_key";
const KEY_LAST_SYNCED_AT: &str = "sync_last_synced_at";
const KEY_USER_EMAIL: &str = "sync_user_email";
const KEY_USER_ID: &str = "sync_user_id";
const KEY_ACCESS_TOKEN_ENC: &str = "sync_access_token_enc";
const KEY_REFRESH_TOKEN_ENC: &str = "sync_refresh_token_enc";

fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    let result: rusqlite::Result<Option<String>> = conn.query_row(
        "SELECT value FROM app_settings WHERE key = ?",
        [key],
        |row| row.get::<_, Option<String>>(0),
    );
    match result {
        Ok(v) => Ok(v),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value, value_type, updated_at) VALUES (?, ?, 'string', ?)",
        rusqlite::params![key, value, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn delete_setting(conn: &Connection, key: &str) -> Result<(), String> {
    conn.execute("DELETE FROM app_settings WHERE key = ?", [key])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConfigView {
    pub supabase_url: Option<String>,
    pub supabase_anon_key: Option<String>,
    pub last_synced_at: Option<String>,
    pub user_email: Option<String>,
    pub is_signed_in: bool,
}

#[tauri::command]
pub fn sync_get_config(state: State<AppState>) -> Result<ApiResponse<SyncConfigView>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let is_signed_in = get_setting(&db.conn, KEY_ACCESS_TOKEN_ENC)?.is_some();
    Ok(ApiResponse::ok(SyncConfigView {
        supabase_url: get_setting(&db.conn, KEY_SUPABASE_URL)?,
        supabase_anon_key: get_setting(&db.conn, KEY_SUPABASE_ANON_KEY)?,
        last_synced_at: get_setting(&db.conn, KEY_LAST_SYNCED_AT)?,
        user_email: get_setting(&db.conn, KEY_USER_EMAIL)?,
        is_signed_in,
    }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConfigParams {
    pub supabase_url: String,
    pub supabase_anon_key: String,
}

#[tauri::command]
pub fn sync_set_config(state: State<AppState>, params: SyncConfigParams) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    set_setting(&db.conn, KEY_SUPABASE_URL, &params.supabase_url)?;
    set_setting(&db.conn, KEY_SUPABASE_ANON_KEY, &params.supabase_anon_key)?;
    Ok(ApiResponse::ok(true))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSessionParams {
    pub access_token: String,
    pub refresh_token: String,
    pub email: String,
    pub user_id: String,
}

#[tauri::command]
pub fn sync_save_session(state: State<AppState>, params: SyncSessionParams) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let access_enc = Crypto::encrypt(&params.access_token)?;
    let refresh_enc = Crypto::encrypt(&params.refresh_token)?;
    set_setting(&db.conn, KEY_ACCESS_TOKEN_ENC, &access_enc)?;
    set_setting(&db.conn, KEY_REFRESH_TOKEN_ENC, &refresh_enc)?;
    set_setting(&db.conn, KEY_USER_EMAIL, &params.email)?;
    set_setting(&db.conn, KEY_USER_ID, &params.user_id)?;
    Ok(ApiResponse::ok(true))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionView {
    pub access_token: String,
    pub refresh_token: String,
    pub email: String,
    pub user_id: String,
}

#[tauri::command]
pub fn sync_load_session(state: State<AppState>) -> Result<ApiResponse<Option<SessionView>>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let Some(access_enc) = get_setting(&db.conn, KEY_ACCESS_TOKEN_ENC)? else {
        return Ok(ApiResponse::ok(None));
    };
    let Some(refresh_enc) = get_setting(&db.conn, KEY_REFRESH_TOKEN_ENC)? else {
        return Ok(ApiResponse::ok(None));
    };
    let email = get_setting(&db.conn, KEY_USER_EMAIL)?.unwrap_or_default();
    let user_id = get_setting(&db.conn, KEY_USER_ID)?.unwrap_or_default();
    let access_token = Crypto::decrypt(&access_enc)?;
    let refresh_token = Crypto::decrypt(&refresh_enc)?;
    Ok(ApiResponse::ok(Some(SessionView { access_token, refresh_token, email, user_id })))
}

#[tauri::command]
pub fn sync_clear_session(state: State<AppState>) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    delete_setting(&db.conn, KEY_ACCESS_TOKEN_ENC)?;
    delete_setting(&db.conn, KEY_REFRESH_TOKEN_ENC)?;
    delete_setting(&db.conn, KEY_USER_EMAIL)?;
    delete_setting(&db.conn, KEY_USER_ID)?;
    Ok(ApiResponse::ok(true))
}

#[derive(Deserialize)]
pub struct SyncWatermarkParams {
    pub timestamp: String,
}

#[tauri::command]
pub fn sync_set_watermark(state: State<AppState>, params: SyncWatermarkParams) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    set_setting(&db.conn, KEY_LAST_SYNCED_AT, &params.timestamp)?;
    Ok(ApiResponse::ok(true))
}
