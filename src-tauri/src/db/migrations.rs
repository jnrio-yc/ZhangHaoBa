use rusqlite::Connection;

pub fn run(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Create migrations table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );"
    )?;

    let current_version: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current_version < 1 {
        conn.execute_batch(MIGRATION_001)?;
        conn.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (1, 'init_schema', datetime('now'))",
            [],
        )?;
    }

    if current_version < 2 {
        conn.execute_batch(MIGRATION_002)?;
        conn.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (2, 'init_indexes', datetime('now'))",
            [],
        )?;
    }

    if current_version < 3 {
        conn.execute_batch(MIGRATION_003)?;
        conn.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (3, 'seed_default_data', datetime('now'))",
            [],
        )?;
    }

    if current_version < 4 {
        conn.execute_batch(MIGRATION_004)?;
        conn.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (4, 'api_key_groups', datetime('now'))",
            [],
        )?;
    }

    Ok(())
}

const MIGRATION_001: &str = r#"
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_common INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (parent_id) REFERENCES folders(id)
);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    group_key TEXT DEFAULT 'custom',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_group_name_unique
ON tags(group_key, name) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    folder_id TEXT,
    status TEXT NOT NULL DEFAULT 'normal',
    url TEXT,
    base_url TEXT,
    username TEXT,
    password_encrypted TEXT,
    api_key_encrypted TEXT,
    license_key_encrypted TEXT,
    note TEXT,
    expire_at TEXT,
    price_info TEXT,
    platform_name TEXT,
    project_name TEXT,
    environment_name TEXT,
    environment_type TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_common INTEGER NOT NULL DEFAULT 0,
    is_high_risk INTEGER NOT NULL DEFAULT 0,
    is_production INTEGER NOT NULL DEFAULT 0,
    is_verified INTEGER NOT NULL DEFAULT 0,
    is_paid INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_used_at TEXT,
    deleted_at TEXT,
    archived_at TEXT,
    source TEXT DEFAULT 'manual',
    sync_status TEXT DEFAULT 'local',
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (folder_id) REFERENCES folders(id)
);

CREATE TABLE IF NOT EXISTS record_tags (
    record_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (record_id, tag_id),
    FOREIGN KEY (record_id) REFERENCES records(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

CREATE TABLE IF NOT EXISTS custom_fields (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    name TEXT NOT NULL,
    field_key TEXT,
    field_type TEXT NOT NULL,
    value TEXT,
    encrypted_value TEXT,
    is_sensitive INTEGER NOT NULL DEFAULT 0,
    is_searchable INTEGER NOT NULL DEFAULT 1,
    is_copyable INTEGER NOT NULL DEFAULT 1,
    is_visible_in_list INTEGER NOT NULL DEFAULT 0,
    is_exportable INTEGER NOT NULL DEFAULT 1,
    group_name TEXT,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (record_id) REFERENCES records(id)
);

CREATE TABLE IF NOT EXISTS environment_entries (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    entry_name TEXT NOT NULL,
    entry_type TEXT,
    url TEXT NOT NULL,
    role TEXT,
    username TEXT,
    password_encrypted TEXT,
    verification_note TEXT,
    login_steps TEXT,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary INTEGER NOT NULL DEFAULT 0,
    is_high_risk INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (record_id) REFERENCES records(id)
);

CREATE TABLE IF NOT EXISTS record_models (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    model_type TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (record_id) REFERENCES records(id)
);

CREATE TABLE IF NOT EXISTS copy_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    record_type TEXT NOT NULL,
    template_key TEXT NOT NULL,
    template_content TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    contains_sensitive INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_copy_templates_key_unique
ON copy_templates(record_type, template_key) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS usage_logs (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    entry_id TEXT,
    action TEXT NOT NULL,
    field_key TEXT,
    is_sensitive_action INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES records(id),
    FOREIGN KEY (entry_id) REFERENCES environment_entries(id)
);

CREATE TABLE IF NOT EXISTS pending_raw_items (
    id TEXT PRIMARY KEY,
    record_id TEXT,
    raw_text TEXT NOT NULL,
    parsed_json TEXT,
    recommended_type TEXT,
    recommended_folder_id TEXT,
    confidence_level TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    source TEXT DEFAULT 'clipboard',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    resolved_at TEXT,
    deleted_at TEXT,
    FOREIGN KEY (record_id) REFERENCES records(id),
    FOREIGN KEY (recommended_folder_id) REFERENCES folders(id)
);

CREATE TABLE IF NOT EXISTS backup_histories (
    id TEXT PRIMARY KEY,
    backup_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    include_sensitive INTEGER NOT NULL DEFAULT 1,
    backup_status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS health_check_results (
    id TEXT PRIMARY KEY,
    record_id TEXT,
    issue_type TEXT NOT NULL,
    issue_level TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    related_record_ids TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    resolved_at TEXT,
    ignored_at TEXT,
    FOREIGN KEY (record_id) REFERENCES records(id)
);

CREATE TABLE IF NOT EXISTS ignored_health_issues (
    id TEXT PRIMARY KEY,
    issue_type TEXT NOT NULL,
    record_id TEXT,
    fingerprint TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES records(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ignored_health_fingerprint
ON ignored_health_issues(fingerprint);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    value_type TEXT NOT NULL DEFAULT 'string',
    updated_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    record_id UNINDEXED,
    title,
    type,
    folder_name,
    tag_names,
    url,
    username,
    platform_name,
    project_name,
    environment_name,
    entry_names,
    entry_urls,
    roles,
    model_names,
    note,
    custom_text,
    api_key_prefix,
    api_key_suffix,
    license_suffix,
    updated_at UNINDEXED
);
"#;

const MIGRATION_002: &str = r#"
CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
CREATE INDEX IF NOT EXISTS idx_records_folder_id ON records(folder_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_updated_at ON records(updated_at);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at);
CREATE INDEX IF NOT EXISTS idx_records_last_used_at ON records(last_used_at);
CREATE INDEX IF NOT EXISTS idx_records_deleted_at ON records(deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_expire_at ON records(expire_at);
CREATE INDEX IF NOT EXISTS idx_records_is_favorite ON records(is_favorite);
CREATE INDEX IF NOT EXISTS idx_records_is_common ON records(is_common);
CREATE INDEX IF NOT EXISTS idx_records_is_high_risk ON records(is_high_risk);
CREATE INDEX IF NOT EXISTS idx_records_is_production ON records(is_production);
CREATE INDEX IF NOT EXISTS idx_records_type_deleted ON records(type, deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_folder_deleted ON records(folder_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_status_deleted ON records(status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_expire_deleted ON records(expire_at, deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_favorite_deleted ON records(is_favorite, deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_common_deleted ON records(is_common, deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_risk_deleted ON records(is_high_risk, is_production, deleted_at);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_deleted_at ON folders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON folders(sort_order);
CREATE INDEX IF NOT EXISTS idx_folders_is_archived ON folders(is_archived);
CREATE INDEX IF NOT EXISTS idx_tags_group_key ON tags(group_key);
CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON tags(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tags_sort_order ON tags(sort_order);
CREATE INDEX IF NOT EXISTS idx_record_tags_record_id ON record_tags(record_id);
CREATE INDEX IF NOT EXISTS idx_record_tags_tag_id ON record_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_record_id ON custom_fields(record_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_field_key ON custom_fields(field_key);
CREATE INDEX IF NOT EXISTS idx_custom_fields_deleted_at ON custom_fields(deleted_at);
CREATE INDEX IF NOT EXISTS idx_custom_fields_searchable ON custom_fields(is_searchable);
CREATE INDEX IF NOT EXISTS idx_environment_entries_record_id ON environment_entries(record_id);
CREATE INDEX IF NOT EXISTS idx_environment_entries_entry_type ON environment_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_environment_entries_deleted_at ON environment_entries(deleted_at);
CREATE INDEX IF NOT EXISTS idx_environment_entries_url ON environment_entries(url);
CREATE INDEX IF NOT EXISTS idx_environment_entries_primary ON environment_entries(record_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_record_models_record_id ON record_models(record_id);
CREATE INDEX IF NOT EXISTS idx_record_models_model_name ON record_models(model_name);
CREATE INDEX IF NOT EXISTS idx_record_models_deleted_at ON record_models(deleted_at);
CREATE INDEX IF NOT EXISTS idx_record_models_default ON record_models(record_id, is_default);
CREATE INDEX IF NOT EXISTS idx_usage_logs_record_id ON usage_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_entry_id ON usage_logs(entry_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action ON usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_raw_items_status ON pending_raw_items(status);
CREATE INDEX IF NOT EXISTS idx_pending_raw_items_created_at ON pending_raw_items(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_raw_items_deleted_at ON pending_raw_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_health_record_id ON health_check_results(record_id);
CREATE INDEX IF NOT EXISTS idx_health_issue_type ON health_check_results(issue_type);
CREATE INDEX IF NOT EXISTS idx_health_issue_level ON health_check_results(issue_level);
CREATE INDEX IF NOT EXISTS idx_health_status ON health_check_results(status);
"#;

const MIGRATION_003: &str = r#"
INSERT OR IGNORE INTO folders (id, parent_id, name, icon, color, sort_order, is_common, is_archived, created_at, updated_at)
VALUES
    ('folder_work', NULL, '工作', 'briefcase', '#2563EB', 10, 1, 0, datetime('now'), datetime('now')),
    ('folder_personal', NULL, '个人', 'user', '#16A34A', 20, 1, 0, datetime('now'), datetime('now')),
    ('folder_api', NULL, 'API', 'key', '#7C3AED', 30, 1, 0, datetime('now'), datetime('now')),
    ('folder_test_env', NULL, '测试环境', 'monitor', '#F59E0B', 40, 1, 0, datetime('now'), datetime('now')),
    ('folder_links', NULL, '常用链接', 'link', '#0EA5E9', 50, 1, 0, datetime('now'), datetime('now')),
    ('folder_pending', NULL, '待整理', 'inbox', '#6B7280', 60, 1, 0, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO tags (id, name, color, group_key, sort_order, is_system, created_at, updated_at)
VALUES
    ('tag_common', '常用', '#2563EB', 'usage', 10, 1, datetime('now'), datetime('now')),
    ('tag_paid', '付费', '#16A34A', 'status', 20, 1, datetime('now'), datetime('now')),
    ('tag_free', '免费', '#6B7280', 'status', 30, 1, datetime('now'), datetime('now')),
    ('tag_trial', '免费试用', '#F59E0B', 'status', 40, 1, datetime('now'), datetime('now')),
    ('tag_test', '测试', '#0EA5E9', 'usage', 50, 1, datetime('now'), datetime('now')),
    ('tag_production', '生产', '#DC2626', 'risk', 60, 1, datetime('now'), datetime('now')),
    ('tag_high_risk', '高风险', '#DC2626', 'risk', 70, 1, datetime('now'), datetime('now')),
    ('tag_ai_model', '大模型', '#7C3AED', 'platform', 80, 1, datetime('now'), datetime('now')),
    ('tag_api', 'API', '#2563EB', 'usage', 90, 1, datetime('now'), datetime('now')),
    ('tag_link', '链接', '#0EA5E9', 'usage', 100, 1, datetime('now'), datetime('now')),
    ('tag_license', '卡密', '#F59E0B', 'usage', 110, 1, datetime('now'), datetime('now')),
    ('tag_pending', '待整理', '#6B7280', 'status', 120, 1, datetime('now'), datetime('now')),
    ('tag_openai', 'OpenAI', '#10A37F', 'platform', 130, 1, datetime('now'), datetime('now')),
    ('tag_claude', 'Claude', '#D97706', 'platform', 140, 1, datetime('now'), datetime('now')),
    ('tag_gemini', 'Gemini', '#2563EB', 'platform', 150, 1, datetime('now'), datetime('now')),
    ('tag_deepseek', 'DeepSeek', '#4F46E5', 'platform', 160, 1, datetime('now'), datetime('now')),
    ('tag_kimi', 'Kimi', '#7C3AED', 'platform', 170, 1, datetime('now'), datetime('now')),
    ('tag_qwen', 'Qwen', '#0EA5E9', 'platform', 180, 1, datetime('now'), datetime('now')),
    ('tag_glm', 'GLM', '#6366F1', 'platform', 190, 1, datetime('now'), datetime('now')),
    ('tag_doubao', '豆包', '#EF4444', 'platform', 200, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO app_settings (key, value, value_type, updated_at)
VALUES
    ('default_page', 'all_records', 'string', datetime('now')),
    ('default_sort', 'smart', 'string', datetime('now')),
    ('theme', 'light', 'string', datetime('now')),
    ('language', 'zh-CN', 'string', datetime('now')),
    ('strict_mode_enabled', 'false', 'boolean', datetime('now')),
    ('hide_sensitive_by_default', 'true', 'boolean', datetime('now')),
    ('warn_before_copy_high_risk', 'true', 'boolean', datetime('now')),
    ('clear_clipboard_after_copy', 'false', 'boolean', datetime('now')),
    ('clipboard_clear_seconds', '60', 'number', datetime('now')),
    ('auto_backup_enabled', 'false', 'boolean', datetime('now')),
    ('backup_retention_count', '7', 'number', datetime('now')),
    ('default_export_format', 'excel', 'string', datetime('now')),
    ('include_sensitive_in_export_by_default', 'false', 'boolean', datetime('now'));

INSERT OR IGNORE INTO copy_templates (id, name, record_type, template_key, template_content, is_system, contains_sensitive, is_enabled, sort_order, created_at, updated_at)
VALUES
    ('tpl_website_full', 'URL + 用户名 + 密码', 'website_account', 'website_full', '地址：{url}
账号：{username}
密码：{password}', 1, 1, 1, 10, datetime('now'), datetime('now')),
    ('tpl_website_account', '用户名 + 密码', 'website_account', 'website_account', '账号：{username}
密码：{password}', 1, 1, 1, 20, datetime('now'), datetime('now')),
    ('tpl_api_env', '.env 配置', 'api_relay', 'api_env', 'OPENAI_BASE_URL={base_url}
OPENAI_API_KEY={api_key}
MODEL_NAME={default_model}', 1, 1, 1, 10, datetime('now'), datetime('now')),
    ('tpl_api_json', 'JSON 配置', 'api_relay', 'api_json', '{
  "baseURL": "{base_url}",
  "apiKey": "{api_key}",
  "model": "{default_model}"
}', 1, 1, 1, 20, datetime('now'), datetime('now')),
    ('tpl_test_entry_full', '测试环境入口完整信息', 'test_environment', 'test_entry_full', '项目：{project_name}
环境：{environment_name}
入口：{entry.name}
地址：{entry.url}
角色：{entry.role}
账号：{entry.username}
密码：{entry.password}
说明：{entry.note}', 1, 1, 1, 10, datetime('now'), datetime('now')),
    ('tpl_license_full', '卡密完整信息', 'license_key', 'license_full', '软件：{title}
卡密：{license_key}
有效期：{expire_at}
说明：{note}', 1, 1, 1, 10, datetime('now'), datetime('now'));
"#;

const MIGRATION_004: &str = r#"
CREATE TABLE IF NOT EXISTS api_key_groups (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    group_name TEXT,
    api_key_encrypted TEXT,
    balance TEXT,
    models_json TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (record_id) REFERENCES records(id)
);

CREATE INDEX IF NOT EXISTS idx_api_key_groups_record_id ON api_key_groups(record_id);
CREATE INDEX IF NOT EXISTS idx_api_key_groups_deleted_at ON api_key_groups(deleted_at);
"#;
