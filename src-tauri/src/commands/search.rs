use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;
use crate::error::ApiResponse;

#[derive(Serialize)]
pub struct SearchResult {
    pub record_id: String,
    pub title: String,
    pub r#type: String,
    pub folder_name: Option<String>,
    pub url: Option<String>,
    pub username: Option<String>,
    pub snippet: Option<String>,
    pub rank: f64,
}

#[derive(Serialize)]
pub struct ParsedCommand {
    pub command_type: String,
    pub query: String,
    pub filters: Vec<ParsedFilter>,
}

#[derive(Serialize)]
pub struct ParsedFilter {
    pub field: String,
    pub value: String,
}

#[tauri::command]
pub fn search_query(state: State<AppState>, query: String) -> Result<ApiResponse<Vec<SearchResult>>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    if query.trim().is_empty() {
        return Ok(ApiResponse::ok(Vec::new()));
    }

    // Escape FTS5 special characters and add prefix matching
    let fts_query = query
        .split_whitespace()
        .map(|word| format!("\"{}\"*", word.replace('"', "\"\"")))
        .collect::<Vec<_>>()
        .join(" ");

    let mut stmt = db.conn.prepare(
        "SELECT s.record_id, s.title, s.type, s.folder_name, s.url, s.username,
                snippet(search_index, 14, '<b>', '</b>', '...', 32) as snippet,
                rank
         FROM search_index s
         JOIN records r ON s.record_id = r.id
         WHERE search_index MATCH ?
         AND r.deleted_at IS NULL
         ORDER BY rank
         LIMIT 50"
    ).map_err(|e| e.to_string())?;

    let results: Vec<SearchResult> = stmt
        .query_map([&fts_query], |row| {
            Ok(SearchResult {
                record_id: row.get(0)?,
                title: row.get(1)?,
                r#type: row.get(2)?,
                folder_name: row.get(3)?,
                url: row.get(4)?,
                username: row.get(5)?,
                snippet: row.get(6)?,
                rank: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ApiResponse::ok(results))
}

#[tauri::command]
pub fn search_rebuild_index(state: State<AppState>) -> Result<ApiResponse<i64>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Clear existing index
    db.conn.execute("DELETE FROM search_index", []).map_err(|e| e.to_string())?;

    // Rebuild from records
    let count = db.conn.execute(
        "INSERT INTO search_index (record_id, title, type, folder_name, tag_names, url, username,
         platform_name, project_name, environment_name, entry_names, entry_urls, roles,
         model_names, note, custom_text, api_key_prefix, api_key_suffix, license_suffix, updated_at)
         SELECT
            r.id,
            r.title,
            r.type,
            f.name,
            (SELECT GROUP_CONCAT(t.name, ' ') FROM record_tags rt JOIN tags t ON rt.tag_id = t.id WHERE rt.record_id = r.id),
            r.url,
            r.username,
            r.platform_name,
            r.project_name,
            r.environment_name,
            (SELECT GROUP_CONCAT(ee.entry_name, ' ') FROM environment_entries ee WHERE ee.record_id = r.id AND ee.deleted_at IS NULL),
            (SELECT GROUP_CONCAT(ee.url, ' ') FROM environment_entries ee WHERE ee.record_id = r.id AND ee.deleted_at IS NULL),
            (SELECT GROUP_CONCAT(ee.role, ' ') FROM environment_entries ee WHERE ee.record_id = r.id AND ee.deleted_at IS NULL),
            (SELECT GROUP_CONCAT(rm.model_name, ' ') FROM record_models rm WHERE rm.record_id = r.id AND rm.deleted_at IS NULL),
            r.note,
            (SELECT GROUP_CONCAT(cf.value, ' ') FROM custom_fields cf WHERE cf.record_id = r.id AND cf.is_searchable = 1 AND cf.deleted_at IS NULL),
            NULL,
            NULL,
            NULL,
            r.updated_at
         FROM records r
         LEFT JOIN folders f ON r.folder_id = f.id
         WHERE r.deleted_at IS NULL",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(count as i64))
}

#[tauri::command]
pub fn search_parse_command(query: String) -> Result<ApiResponse<ParsedCommand>, String> {
    let mut filters = Vec::new();
    let mut search_terms = Vec::new();

    for part in query.split_whitespace() {
        if let Some((key, value)) = part.split_once(':') {
            filters.push(ParsedFilter {
                field: key.to_string(),
                value: value.to_string(),
            });
        } else {
            search_terms.push(part);
        }
    }

    let command_type = if filters.is_empty() { "search" } else { "filtered_search" };

    Ok(ApiResponse::ok(ParsedCommand {
        command_type: command_type.to_string(),
        query: search_terms.join(" "),
        filters,
    }))
}
