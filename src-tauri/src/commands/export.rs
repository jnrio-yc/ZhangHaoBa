use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;
use crate::crypto::Crypto;
use crate::error::ApiResponse;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportParams {
    pub file_path: String,
    pub format: String, // "csv" or "excel"
    pub record_ids: Option<Vec<String>>,
    pub folder_id: Option<String>,
    pub include_sensitive: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub file_path: String,
    pub record_count: i64,
    pub format: String,
}

#[tauri::command]
pub fn export_records(state: State<AppState>, params: ExportParams) -> Result<ApiResponse<ExportResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let include_sensitive = params.include_sensitive.unwrap_or(false);

    let mut where_clauses = vec!["r.deleted_at IS NULL".to_string()];
    let mut bind_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref folder_id) = params.folder_id {
        where_clauses.push("r.folder_id = ?".to_string());
        bind_values.push(Box::new(folder_id.clone()));
    }

    // TODO: handle record_ids filter

    let where_sql = where_clauses.join(" AND ");
    let query = format!(
        "SELECT r.id, r.title, r.type, f.name, r.url, r.username,
                r.password_encrypted, r.api_key_encrypted, r.license_key_encrypted,
                r.note, r.platform_name, r.project_name, r.environment_name,
                r.created_at, r.updated_at
         FROM records r
         LEFT JOIN folders f ON r.folder_id = f.id
         WHERE {}
         ORDER BY r.updated_at DESC",
        where_sql
    );

    let bind_refs: Vec<&dyn rusqlite::types::ToSql> = bind_values.iter().map(|b| b.as_ref()).collect();
    let mut stmt = db.conn.prepare(&query).map_err(|e| e.to_string())?;

    let rows: Vec<(String, String, String, Option<String>, Option<String>, Option<String>,
                    Option<String>, Option<String>, Option<String>, Option<String>,
                    Option<String>, Option<String>, Option<String>, String, String)> = stmt
        .query_map(bind_refs.as_slice(), |row| {
            Ok((
                row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?,
                row.get(4)?, row.get(5)?, row.get(6)?, row.get(7)?,
                row.get(8)?, row.get(9)?, row.get(10)?, row.get(11)?,
                row.get(12)?, row.get(13)?, row.get(14)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let record_count = rows.len() as i64;

    match params.format.as_str() {
        "csv" => {
            let mut wtr = csv::Writer::from_path(&params.file_path)
                .map_err(|e| format!("CSV导出失败: {}", e))?;

            let mut headers = vec!["标题", "类型", "文件夹", "URL", "用户名", "备注",
                                    "平台", "项目", "环境", "创建时间", "更新时间"];
            if include_sensitive {
                headers.extend_from_slice(&["密码", "API Key", "License Key"]);
            }
            wtr.write_record(&headers).map_err(|e| format!("CSV写入失败: {}", e))?;

            for row in &rows {
                let mut record = vec![
                    row.1.clone(), row.2.clone(),
                    row.3.clone().unwrap_or_default(),
                    row.4.clone().unwrap_or_default(),
                    row.5.clone().unwrap_or_default(),
                    row.9.clone().unwrap_or_default(),
                    row.10.clone().unwrap_or_default(),
                    row.11.clone().unwrap_or_default(),
                    row.12.clone().unwrap_or_default(),
                    row.13.clone(), row.14.clone(),
                ];
                if include_sensitive {
                    let password = row.6.as_ref().and_then(|e| Crypto::decrypt(e).ok()).unwrap_or_default();
                    let api_key = row.7.as_ref().and_then(|e| Crypto::decrypt(e).ok()).unwrap_or_default();
                    let license_key = row.8.as_ref().and_then(|e| Crypto::decrypt(e).ok()).unwrap_or_default();
                    record.extend_from_slice(&[password, api_key, license_key]);
                }
                wtr.write_record(&record).map_err(|e| format!("CSV写入失败: {}", e))?;
            }
            wtr.flush().map_err(|e| format!("CSV写入失败: {}", e))?;
        }
        "excel" => {
            let mut workbook = rust_xlsxwriter::Workbook::new();
            let worksheet = workbook.add_worksheet();

            let headers: Vec<&str> = if include_sensitive {
                vec!["标题", "类型", "文件夹", "URL", "用户名", "密码", "API Key", "License Key",
                     "备注", "平台", "项目", "环境", "创建时间", "更新时间"]
            } else {
                vec!["标题", "类型", "文件夹", "URL", "用户名",
                     "备注", "平台", "项目", "环境", "创建时间", "更新时间"]
            };

            for (col, header) in headers.iter().enumerate() {
                worksheet.write_string(0, col as u16, *header)
                    .map_err(|e| format!("Excel写入失败: {}", e))?;
            }

            for (row_idx, row) in rows.iter().enumerate() {
                let r = (row_idx + 1) as u32;
                if include_sensitive {
                    let password = row.6.as_ref().and_then(|e| Crypto::decrypt(e).ok()).unwrap_or_default();
                    let api_key = row.7.as_ref().and_then(|e| Crypto::decrypt(e).ok()).unwrap_or_default();
                    let license_key = row.8.as_ref().and_then(|e| Crypto::decrypt(e).ok()).unwrap_or_default();
                    let vals = vec![
                        row.1.clone(), row.2.clone(), row.3.clone().unwrap_or_default(),
                        row.4.clone().unwrap_or_default(), row.5.clone().unwrap_or_default(),
                        password, api_key, license_key,
                        row.9.clone().unwrap_or_default(), row.10.clone().unwrap_or_default(),
                        row.11.clone().unwrap_or_default(), row.12.clone().unwrap_or_default(),
                        row.13.clone(), row.14.clone(),
                    ];
                    for (col, val) in vals.iter().enumerate() {
                        worksheet.write_string(r, col as u16, val)
                            .map_err(|e| format!("Excel写入失败: {}", e))?;
                    }
                } else {
                    let vals = vec![
                        row.1.clone(), row.2.clone(), row.3.clone().unwrap_or_default(),
                        row.4.clone().unwrap_or_default(), row.5.clone().unwrap_or_default(),
                        row.9.clone().unwrap_or_default(), row.10.clone().unwrap_or_default(),
                        row.11.clone().unwrap_or_default(), row.12.clone().unwrap_or_default(),
                        row.13.clone(), row.14.clone(),
                    ];
                    for (col, val) in vals.iter().enumerate() {
                        worksheet.write_string(r, col as u16, val)
                            .map_err(|e| format!("Excel写入失败: {}", e))?;
                    }
                }
            }

            workbook.save(&params.file_path)
                .map_err(|e| format!("Excel保存失败: {}", e))?;
        }
        _ => return Ok(ApiResponse::err("INVALID_FORMAT", "不支持的导出格式")),
    }

    Ok(ApiResponse::ok(ExportResult {
        file_path: params.file_path,
        record_count,
        format: params.format,
    }))
}
