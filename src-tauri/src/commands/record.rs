use serde::{Deserialize, Serialize};
use tauri::State;
use rusqlite::Connection;
use crate::AppState;
use crate::crypto::Crypto;
use crate::error::ApiResponse;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordListItem {
    pub id: String,
    pub title: String,
    pub r#type: String,
    pub folder_id: Option<String>,
    pub folder_name: Option<String>,
    pub status: String,
    pub url: Option<String>,
    pub base_url: Option<String>,
    pub username: Option<String>,
    pub password_masked: Option<String>,
    pub api_key_masked: Option<String>,
    pub license_key_masked: Option<String>,
    pub platform_name: Option<String>,
    pub project_name: Option<String>,
    pub environment_name: Option<String>,
    pub is_favorite: bool,
    pub is_common: bool,
    pub is_high_risk: bool,
    pub is_production: bool,
    pub has_password: bool,
    pub has_api_key: bool,
    pub has_license_key: bool,
    pub expire_at: Option<String>,
    pub tag_ids: Vec<String>,
    pub tag_names: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    pub last_used_at: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordDetail {
    pub id: String,
    pub title: String,
    pub r#type: String,
    pub folder_id: Option<String>,
    pub status: String,
    pub url: Option<String>,
    pub base_url: Option<String>,
    pub username: Option<String>,
    pub password_masked: Option<String>,
    pub api_key_masked: Option<String>,
    pub license_key_masked: Option<String>,
    pub note: Option<String>,
    pub expire_at: Option<String>,
    pub price_info: Option<String>,
    pub platform_name: Option<String>,
    pub project_name: Option<String>,
    pub environment_name: Option<String>,
    pub environment_type: Option<String>,
    pub is_favorite: bool,
    pub is_common: bool,
    pub is_high_risk: bool,
    pub is_production: bool,
    pub is_verified: bool,
    pub is_paid: bool,
    pub created_at: String,
    pub updated_at: String,
    pub last_used_at: Option<String>,
    pub version: i64,
    pub api_key_groups: Vec<ApiKeyGroupItem>,
    pub models: Vec<ModelItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyGroupItem {
    pub id: String,
    pub group_name: Option<String>,
    pub api_key_masked: Option<String>,
    pub balance: Option<String>,
    pub models: Vec<String>,
    pub sort_order: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelItem {
    pub id: String,
    pub model_name: String,
    pub model_type: Option<String>,
    pub is_default: bool,
    pub is_favorite: bool,
    pub note: Option<String>,
    pub sort_order: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyGroupInput {
    pub id: Option<String>,
    pub group_name: Option<String>,
    pub api_key: Option<String>,
    pub balance: Option<String>,
    pub models: Option<Vec<String>>,
    pub sort_order: Option<i32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInput {
    pub id: Option<String>,
    pub model_name: String,
    pub model_type: Option<String>,
    pub is_default: Option<bool>,
    pub is_favorite: Option<bool>,
    pub note: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordListParams {
    pub folder_id: Option<String>,
    pub tag_id: Option<String>,
    pub r#type: Option<String>,
    pub status: Option<String>,
    pub is_favorite: Option<bool>,
    pub is_common: Option<bool>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordListResponse {
    pub items: Vec<RecordListItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordCreateParams {
    pub title: String,
    pub r#type: String,
    pub folder_id: Option<String>,
    pub url: Option<String>,
    pub base_url: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub api_key: Option<String>,
    pub license_key: Option<String>,
    pub note: Option<String>,
    pub expire_at: Option<String>,
    pub price_info: Option<String>,
    pub platform_name: Option<String>,
    pub project_name: Option<String>,
    pub environment_name: Option<String>,
    pub environment_type: Option<String>,
    pub is_favorite: Option<bool>,
    pub is_common: Option<bool>,
    pub is_high_risk: Option<bool>,
    pub is_production: Option<bool>,
    pub is_paid: Option<bool>,
    pub tag_ids: Option<Vec<String>>,
    pub models: Option<Vec<ModelInput>>,
    pub api_key_groups: Option<Vec<ApiKeyGroupInput>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordUpdateParams {
    pub id: String,
    pub title: Option<String>,
    pub r#type: Option<String>,
    pub folder_id: Option<String>,
    pub url: Option<String>,
    pub base_url: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub api_key: Option<String>,
    pub license_key: Option<String>,
    pub note: Option<String>,
    pub expire_at: Option<String>,
    pub price_info: Option<String>,
    pub platform_name: Option<String>,
    pub project_name: Option<String>,
    pub environment_name: Option<String>,
    pub environment_type: Option<String>,
    pub is_favorite: Option<bool>,
    pub is_common: Option<bool>,
    pub is_high_risk: Option<bool>,
    pub is_production: Option<bool>,
    pub is_paid: Option<bool>,
    pub tag_ids: Option<Vec<String>>,
    pub models: Option<Vec<ModelInput>>,
    pub api_key_groups: Option<Vec<ApiKeyGroupInput>>,
}

#[tauri::command]
pub fn record_list(state: State<AppState>, params: RecordListParams) -> Result<ApiResponse<RecordListResponse>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(50).min(200);
    let offset = (page - 1) * page_size;

    let mut where_clauses = vec!["r.deleted_at IS NULL".to_string()];
    let mut bind_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref folder_id) = params.folder_id {
        where_clauses.push("r.folder_id = ?".to_string());
        bind_values.push(Box::new(folder_id.clone()));
    }
    if let Some(ref record_type) = params.r#type {
        where_clauses.push("r.type = ?".to_string());
        bind_values.push(Box::new(record_type.clone()));
    }
    if let Some(ref status) = params.status {
        where_clauses.push("r.status = ?".to_string());
        bind_values.push(Box::new(status.clone()));
    }
    if let Some(is_favorite) = params.is_favorite {
        where_clauses.push("r.is_favorite = ?".to_string());
        bind_values.push(Box::new(is_favorite as i32));
    }
    if let Some(is_common) = params.is_common {
        where_clauses.push("r.is_common = ?".to_string());
        bind_values.push(Box::new(is_common as i32));
    }

    let where_sql = where_clauses.join(" AND ");

    let sort_sql = match params.sort_by.as_deref() {
        Some("title") => "r.title ASC",
        Some("created_at") => "r.created_at DESC",
        Some("last_used_at") => "r.last_used_at DESC NULLS LAST",
        _ => "r.is_common DESC, r.updated_at DESC",
    };

    let count_sql = format!("SELECT COUNT(*) FROM records r WHERE {}", where_sql);
    let count_params: Vec<&dyn rusqlite::types::ToSql> = bind_values.iter().map(|b| b.as_ref()).collect();
    let total: i64 = db.conn
        .query_row(&count_sql, count_params.as_slice(), |row| row.get(0))
        .unwrap_or(0);

    let query_sql = format!(
        "SELECT r.id, r.title, r.type, r.folder_id, r.status, r.url, r.base_url,
                r.username, r.password_encrypted, r.api_key_encrypted,
                r.license_key_encrypted, r.platform_name, r.project_name,
                r.environment_name,
                r.is_favorite, r.is_common, r.is_high_risk, r.is_production,
                r.expire_at, r.created_at, r.updated_at, r.last_used_at,
                f.name as folder_name
         FROM records r
         LEFT JOIN folders f ON r.folder_id = f.id
         WHERE {}
         ORDER BY {}
         LIMIT ? OFFSET ?",
        where_sql, sort_sql
    );

    let mut all_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    for v in &bind_values {
        // Re-create boxed values for the second query
    }
    // Rebuild bind values for query
    let mut query_bind: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref folder_id) = params.folder_id {
        query_bind.push(Box::new(folder_id.clone()));
    }
    if let Some(ref record_type) = params.r#type {
        query_bind.push(Box::new(record_type.clone()));
    }
    if let Some(ref status) = params.status {
        query_bind.push(Box::new(status.clone()));
    }
    if let Some(is_favorite) = params.is_favorite {
        query_bind.push(Box::new(is_favorite as i32));
    }
    if let Some(is_common) = params.is_common {
        query_bind.push(Box::new(is_common as i32));
    }
    query_bind.push(Box::new(page_size));
    query_bind.push(Box::new(offset));

    let query_params: Vec<&dyn rusqlite::types::ToSql> = query_bind.iter().map(|b| b.as_ref()).collect();

    let mut stmt = db.conn.prepare(&query_sql).map_err(|e| e.to_string())?;
    let items: Vec<RecordListItem> = stmt
        .query_map(query_params.as_slice(), |row| {
            let password_encrypted: Option<String> = row.get(8)?;
            let api_key_encrypted: Option<String> = row.get(9)?;
            let license_key_encrypted: Option<String> = row.get(10)?;
            let password_masked = password_encrypted
                .as_ref()
                .and_then(|value| Crypto::decrypt(value).ok())
                .map(|value| Crypto::mask_value(&value, 1, 1));
            let api_key_masked = api_key_encrypted
                .as_ref()
                .and_then(|value| Crypto::decrypt(value).ok())
                .map(|value| Crypto::mask_value(&value, 4, 4));
            let license_key_masked = license_key_encrypted
                .as_ref()
                .and_then(|value| Crypto::decrypt(value).ok())
                .map(|value| Crypto::mask_value(&value, 0, 4));

            Ok(RecordListItem {
                id: row.get(0)?,
                title: row.get(1)?,
                r#type: row.get(2)?,
                folder_id: row.get(3)?,
                folder_name: row.get(22)?,
                status: row.get(4)?,
                url: row.get(5)?,
                base_url: row.get(6)?,
                username: row.get(7)?,
                password_masked,
                api_key_masked,
                license_key_masked,
                platform_name: row.get(11)?,
                project_name: row.get(12)?,
                environment_name: row.get(13)?,
                is_favorite: row.get::<_, i32>(14)? != 0,
                is_common: row.get::<_, i32>(15)? != 0,
                is_high_risk: row.get::<_, i32>(16)? != 0,
                is_production: row.get::<_, i32>(17)? != 0,
                has_password: password_encrypted.is_some(),
                has_api_key: api_key_encrypted.is_some(),
                has_license_key: license_key_encrypted.is_some(),
                expire_at: row.get(18)?,
                tag_ids: Vec::new(),
                tag_names: Vec::new(),
                created_at: row.get(19)?,
                updated_at: row.get(20)?,
                last_used_at: row.get(21)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ApiResponse::ok(RecordListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

#[tauri::command]
pub fn record_get_detail(state: State<AppState>, id: String) -> Result<ApiResponse<RecordDetail>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let result = db.conn.query_row(
        "SELECT id, title, type, folder_id, status, url, base_url, username,
                password_encrypted, api_key_encrypted, license_key_encrypted,
                note, expire_at, price_info, platform_name, project_name,
                environment_name, environment_type,
                is_favorite, is_common, is_high_risk, is_production, is_verified, is_paid,
                created_at, updated_at, last_used_at, version
         FROM records WHERE id = ? AND deleted_at IS NULL",
        [&id],
        |row| {
            let password_encrypted: Option<String> = row.get(8)?;
            let api_key_encrypted: Option<String> = row.get(9)?;
            let license_key_encrypted: Option<String> = row.get(10)?;

            let password_masked = password_encrypted.as_ref().and_then(|enc| {
                Crypto::decrypt(enc).ok().map(|plain| Crypto::mask_value(&plain, 1, 1))
            });
            let api_key_masked = api_key_encrypted.as_ref().and_then(|enc| {
                Crypto::decrypt(enc).ok().map(|plain| Crypto::mask_value(&plain, 4, 4))
            });
            let license_key_masked = license_key_encrypted.as_ref().and_then(|enc| {
                Crypto::decrypt(enc).ok().map(|plain| Crypto::mask_value(&plain, 0, 4))
            });

            Ok(RecordDetail {
                id: row.get(0)?,
                title: row.get(1)?,
                r#type: row.get(2)?,
                folder_id: row.get(3)?,
                status: row.get(4)?,
                url: row.get(5)?,
                base_url: row.get(6)?,
                username: row.get(7)?,
                password_masked,
                api_key_masked,
                license_key_masked,
                note: row.get(11)?,
                expire_at: row.get(12)?,
                price_info: row.get(13)?,
                platform_name: row.get(14)?,
                project_name: row.get(15)?,
                environment_name: row.get(16)?,
                environment_type: row.get(17)?,
                is_favorite: row.get::<_, i32>(18)? != 0,
                is_common: row.get::<_, i32>(19)? != 0,
                is_high_risk: row.get::<_, i32>(20)? != 0,
                is_production: row.get::<_, i32>(21)? != 0,
                is_verified: row.get::<_, i32>(22)? != 0,
                is_paid: row.get::<_, i32>(23)? != 0,
                created_at: row.get(24)?,
                updated_at: row.get(25)?,
                last_used_at: row.get(26)?,
                version: row.get(27)?,
                api_key_groups: Vec::new(),
                models: Vec::new(),
            })
        },
    );

    match result {
        Ok(mut detail) => {
            detail.api_key_groups = load_api_key_groups(&db.conn, &id)?;
            detail.models = load_models(&db.conn, &id)?;
            Ok(ApiResponse::ok(detail))
        },
        Err(_) => Ok(ApiResponse::err("RECORD_NOT_FOUND", "记录不存在或已被删除")),
    }
}

#[tauri::command]
pub fn record_create(state: State<AppState>, params: RecordCreateParams) -> Result<ApiResponse<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let password_encrypted = params.password.as_ref()
        .map(|p| Crypto::encrypt(p))
        .transpose()
        .map_err(|e| e)?;

    let api_key_encrypted = params.api_key.as_ref()
        .map(|k| Crypto::encrypt(k))
        .transpose()
        .map_err(|e| e)?;

    let license_key_encrypted = params.license_key.as_ref()
        .map(|k| Crypto::encrypt(k))
        .transpose()
        .map_err(|e| e)?;

    db.conn.execute(
        "INSERT INTO records (id, title, type, folder_id, status, url, base_url, username,
         password_encrypted, api_key_encrypted, license_key_encrypted,
         note, expire_at, price_info, platform_name, project_name,
         environment_name, environment_type,
         is_favorite, is_common, is_high_risk, is_production, is_paid,
         created_at, updated_at)
         VALUES (?, ?, ?, ?, 'normal', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            id, params.title, params.r#type, params.folder_id,
            params.url, params.base_url, params.username,
            password_encrypted, api_key_encrypted, license_key_encrypted,
            params.note, params.expire_at, params.price_info,
            params.platform_name, params.project_name,
            params.environment_name, params.environment_type,
            params.is_favorite.unwrap_or(false) as i32,
            params.is_common.unwrap_or(false) as i32,
            params.is_high_risk.unwrap_or(false) as i32,
            params.is_production.unwrap_or(false) as i32,
            params.is_paid.unwrap_or(false) as i32,
            now, now,
        ],
    ).map_err(|e| e.to_string())?;

    // Insert tags
    if let Some(tag_ids) = &params.tag_ids {
        for tag_id in tag_ids {
            db.conn.execute(
                "INSERT OR IGNORE INTO record_tags (record_id, tag_id, created_at) VALUES (?, ?, ?)",
                rusqlite::params![id, tag_id, now],
            ).map_err(|e| e.to_string())?;
        }
    }

    if let Some(models) = &params.models {
        save_models(&db.conn, &id, models, &now)?;
    }

    if let Some(groups) = &params.api_key_groups {
        save_api_key_groups(&db.conn, &id, groups, &now)?;
    }

    Ok(ApiResponse::ok(id))
}

#[tauri::command]
pub fn record_update(state: State<AppState>, params: RecordUpdateParams) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let mut set_clauses = vec!["updated_at = ?".to_string()];
    let mut bind_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now.clone())];

    macro_rules! add_field {
        ($field:ident) => {
            if let Some(ref val) = params.$field {
                set_clauses.push(format!("{} = ?", stringify!($field)));
                bind_values.push(Box::new(val.clone()));
            }
        };
    }

    add_field!(title);
    add_field!(url);
    add_field!(base_url);
    add_field!(username);
    add_field!(note);
    add_field!(expire_at);
    add_field!(price_info);
    add_field!(platform_name);
    add_field!(project_name);
    add_field!(environment_name);
    add_field!(environment_type);
    add_field!(folder_id);

    if let Some(ref record_type) = params.r#type {
        set_clauses.push("type = ?".to_string());
        bind_values.push(Box::new(record_type.clone()));
    }

    if let Some(ref password) = params.password {
        let encrypted = Crypto::encrypt(password).map_err(|e| e)?;
        set_clauses.push("password_encrypted = ?".to_string());
        bind_values.push(Box::new(encrypted));
    }

    if let Some(ref api_key) = params.api_key {
        let encrypted = Crypto::encrypt(api_key).map_err(|e| e)?;
        set_clauses.push("api_key_encrypted = ?".to_string());
        bind_values.push(Box::new(encrypted));
    }

    if let Some(ref license_key) = params.license_key {
        let encrypted = Crypto::encrypt(license_key).map_err(|e| e)?;
        set_clauses.push("license_key_encrypted = ?".to_string());
        bind_values.push(Box::new(encrypted));
    }

    if let Some(is_high_risk) = params.is_high_risk {
        set_clauses.push("is_high_risk = ?".to_string());
        bind_values.push(Box::new(is_high_risk as i32));
    }
    if let Some(is_production) = params.is_production {
        set_clauses.push("is_production = ?".to_string());
        bind_values.push(Box::new(is_production as i32));
    }
    if let Some(is_paid) = params.is_paid {
        set_clauses.push("is_paid = ?".to_string());
        bind_values.push(Box::new(is_paid as i32));
    }
    if let Some(is_favorite) = params.is_favorite {
        set_clauses.push("is_favorite = ?".to_string());
        bind_values.push(Box::new(is_favorite as i32));
    }
    if let Some(is_common) = params.is_common {
        set_clauses.push("is_common = ?".to_string());
        bind_values.push(Box::new(is_common as i32));
    }

    // Increment version
    set_clauses.push("version = version + 1".to_string());

    bind_values.push(Box::new(params.id.clone()));

    let sql = format!(
        "UPDATE records SET {} WHERE id = ? AND deleted_at IS NULL",
        set_clauses.join(", ")
    );
    let params_ref: Vec<&dyn rusqlite::types::ToSql> = bind_values.iter().map(|b| b.as_ref()).collect();
    db.conn.execute(&sql, params_ref.as_slice()).map_err(|e| e.to_string())?;

    // Update tags if provided
    if let Some(tag_ids) = &params.tag_ids {
        db.conn.execute("DELETE FROM record_tags WHERE record_id = ?", [&params.id])
            .map_err(|e| e.to_string())?;
        for tag_id in tag_ids {
            db.conn.execute(
                "INSERT OR IGNORE INTO record_tags (record_id, tag_id, created_at) VALUES (?, ?, ?)",
                rusqlite::params![params.id, tag_id, now],
            ).map_err(|e| e.to_string())?;
        }
    }

    if let Some(models) = &params.models {
        save_models(&db.conn, &params.id, models, &now)?;
    }

    if let Some(groups) = &params.api_key_groups {
        save_api_key_groups(&db.conn, &params.id, groups, &now)?;
    }

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn record_delete(state: State<AppState>, id: String) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "UPDATE records SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        rusqlite::params![now, now, id],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn record_restore(state: State<AppState>, id: String) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "UPDATE records SET deleted_at = NULL, updated_at = ? WHERE id = ?",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn record_permanent_delete(state: State<AppState>, id: String) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Delete related data
    db.conn.execute("DELETE FROM record_tags WHERE record_id = ?", [&id]).map_err(|e| e.to_string())?;
    db.conn.execute("DELETE FROM custom_fields WHERE record_id = ?", [&id]).map_err(|e| e.to_string())?;
    db.conn.execute("DELETE FROM environment_entries WHERE record_id = ?", [&id]).map_err(|e| e.to_string())?;
    db.conn.execute("DELETE FROM record_models WHERE record_id = ?", [&id]).map_err(|e| e.to_string())?;
    db.conn.execute("DELETE FROM api_key_groups WHERE record_id = ?", [&id]).map_err(|e| e.to_string())?;
    db.conn.execute("DELETE FROM usage_logs WHERE record_id = ?", [&id]).map_err(|e| e.to_string())?;
    db.conn.execute("DELETE FROM records WHERE id = ?", [&id]).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub fn record_toggle_favorite(state: State<AppState>, id: String, value: bool) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "UPDATE records SET is_favorite = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        rusqlite::params![value as i32, now, id],
    ).map_err(|e| e.to_string())?;

    let is_favorite: bool = db.conn
        .query_row("SELECT is_favorite FROM records WHERE id = ?", [&id], |row| row.get::<_, i32>(0))
        .map(|v| v != 0)
        .unwrap_or(false);

    Ok(ApiResponse::ok(is_favorite))
}

#[tauri::command]
pub fn record_toggle_common(state: State<AppState>, id: String, value: bool) -> Result<ApiResponse<bool>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    db.conn.execute(
        "UPDATE records SET is_common = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        rusqlite::params![value as i32, now, id],
    ).map_err(|e| e.to_string())?;

    let is_common: bool = db.conn
        .query_row("SELECT is_common FROM records WHERE id = ?", [&id], |row| row.get::<_, i32>(0))
        .map(|v| v != 0)
        .unwrap_or(false);

    Ok(ApiResponse::ok(is_common))
}

fn load_models(conn: &Connection, record_id: &str) -> Result<Vec<ModelItem>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, model_name, model_type, is_default, is_favorite, note, sort_order
         FROM record_models
         WHERE record_id = ? AND deleted_at IS NULL
         ORDER BY sort_order ASC, created_at ASC",
    ).map_err(|e| e.to_string())?;

    let models = stmt.query_map([record_id], |row| {
        Ok(ModelItem {
            id: row.get(0)?,
            model_name: row.get(1)?,
            model_type: row.get(2)?,
            is_default: row.get::<_, i32>(3)? != 0,
            is_favorite: row.get::<_, i32>(4)? != 0,
            note: row.get(5)?,
            sort_order: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?
      .filter_map(|row| row.ok())
      .collect();

    Ok(models)
}

fn load_api_key_groups(conn: &Connection, record_id: &str) -> Result<Vec<ApiKeyGroupItem>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, group_name, api_key_encrypted, balance, models_json, sort_order
         FROM api_key_groups
         WHERE record_id = ? AND deleted_at IS NULL
         ORDER BY sort_order ASC, created_at ASC",
    ).map_err(|e| e.to_string())?;

    let groups = stmt.query_map([record_id], |row| {
        let api_key_encrypted: Option<String> = row.get(2)?;
        let api_key_masked = api_key_encrypted
            .as_ref()
            .and_then(|value| Crypto::decrypt(value).ok())
            .map(|value| Crypto::mask_value(&value, 4, 4));
        let models_json: Option<String> = row.get(4)?;
        let models = models_json
            .as_deref()
            .and_then(|value| serde_json::from_str::<Vec<String>>(value).ok())
            .unwrap_or_default();

        Ok(ApiKeyGroupItem {
            id: row.get(0)?,
            group_name: row.get(1)?,
            api_key_masked,
            balance: row.get(3)?,
            models,
            sort_order: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
      .filter_map(|row| row.ok())
      .collect();

    Ok(groups)
}

fn save_models(conn: &Connection, record_id: &str, models: &[ModelInput], now: &str) -> Result<(), String> {
    conn.execute("DELETE FROM record_models WHERE record_id = ?", [record_id])
        .map_err(|e| e.to_string())?;

    for (index, model) in models.iter().enumerate() {
        let name = model.model_name.trim();
        if name.is_empty() {
            continue;
        }
        let id = model.id.clone().unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        conn.execute(
            "INSERT INTO record_models (
                id, record_id, model_name, model_type, is_default, is_favorite,
                note, sort_order, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                id,
                record_id,
                name,
                model.model_type,
                model.is_default.unwrap_or(false) as i32,
                model.is_favorite.unwrap_or(false) as i32,
                model.note,
                index as i32,
                now,
                now,
            ],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn save_api_key_groups(conn: &Connection, record_id: &str, groups: &[ApiKeyGroupInput], now: &str) -> Result<(), String> {
    let mut previous_keys = std::collections::HashMap::<String, Option<String>>::new();
    {
        let mut stmt = conn.prepare("SELECT id, api_key_encrypted FROM api_key_groups WHERE record_id = ?")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map([record_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
        }).map_err(|e| e.to_string())?;
        for row in rows.filter_map(|row| row.ok()) {
            previous_keys.insert(row.0, row.1);
        }
    }

    conn.execute("DELETE FROM api_key_groups WHERE record_id = ?", [record_id])
        .map_err(|e| e.to_string())?;

    for (index, group) in groups.iter().enumerate() {
        let id = group.id.clone().unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let api_key_encrypted = match group.api_key.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
            Some(value) => Some(Crypto::encrypt(value).map_err(|e| e)?),
            None => previous_keys.get(&id).cloned().flatten(),
        };
        let models = group.models.clone().unwrap_or_default();
        let models_json = serde_json::to_string(&models).map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO api_key_groups (
                id, record_id, group_name, api_key_encrypted, balance,
                models_json, sort_order, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                id,
                record_id,
                group.group_name,
                api_key_encrypted,
                group.balance,
                models_json,
                group.sort_order.unwrap_or(index as i32),
                now,
                now,
            ],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{RecordCreateParams, RecordListItem, RecordListParams};

    #[test]
    fn record_create_params_accept_camel_case_fields() {
        let params: RecordCreateParams = serde_json::from_value(serde_json::json!({
            "title": "Test account",
            "type": "website_account",
            "folderId": "folder-1",
            "tagIds": ["tag-1"],
            "isFavorite": true
        }))
        .expect("camelCase record payload should deserialize");

        assert_eq!(params.folder_id.as_deref(), Some("folder-1"));
        assert_eq!(params.tag_ids, Some(vec!["tag-1".to_string()]));
        assert_eq!(params.is_favorite, Some(true));
    }

    #[test]
    fn record_list_params_accept_favorite_filter() {
        let params: RecordListParams = serde_json::from_value(serde_json::json!({
            "isFavorite": true,
            "isCommon": false,
            "pageSize": 200
        }))
        .expect("favorite list filters should deserialize");

        assert_eq!(params.is_favorite, Some(true));
        assert_eq!(params.is_common, Some(false));
        assert_eq!(params.page_size, Some(200));
    }

    #[test]
    fn record_list_item_serializes_with_camel_case_fields() {
        let item = RecordListItem {
            id: "record-1".to_string(),
            title: "Test account".to_string(),
            r#type: "website_account".to_string(),
            folder_id: Some("folder-1".to_string()),
            folder_name: Some("Personal".to_string()),
            status: "normal".to_string(),
            url: None,
            base_url: None,
            username: None,
            password_masked: None,
            api_key_masked: None,
            license_key_masked: None,
            platform_name: None,
            project_name: None,
            environment_name: None,
            is_favorite: true,
            is_common: false,
            is_high_risk: false,
            is_production: false,
            has_password: false,
            has_api_key: false,
            has_license_key: false,
            expire_at: None,
            tag_ids: vec![],
            tag_names: vec![],
            created_at: "2026-06-19T00:00:00Z".to_string(),
            updated_at: "2026-06-19T00:00:00Z".to_string(),
            last_used_at: None,
        };

        let value = serde_json::to_value(item).expect("record should serialize");
        assert_eq!(value["folderId"], "folder-1");
        assert_eq!(value["isFavorite"], true);
        assert_eq!(value["updatedAt"], "2026-06-19T00:00:00Z");
        assert!(value.get("folder_id").is_none());
    }
}
