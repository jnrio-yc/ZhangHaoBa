#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod crypto;
mod error;

use db::Database;
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<Database>,
}

fn main() {
    let db = Database::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(db),
        })
        .invoke_handler(tauri::generate_handler![
            commands::app::app_init,
            commands::app::app_get_info,
            commands::record::record_list,
            commands::record::record_get_detail,
            commands::record::record_create,
            commands::record::record_update,
            commands::record::record_delete,
            commands::record::record_restore,
            commands::record::record_permanent_delete,
            commands::record::record_toggle_favorite,
            commands::record::record_toggle_common,
            commands::folder::folder_list,
            commands::folder::folder_create,
            commands::folder::folder_update,
            commands::folder::folder_delete,
            commands::tag::tag_list,
            commands::tag::tag_create,
            commands::tag::tag_update,
            commands::tag::tag_delete,
            commands::tag::tag_merge,
            commands::search::search_query,
            commands::search::search_rebuild_index,
            commands::search::search_parse_command,
            commands::copy::copy_field,
            commands::copy::copy_template,
            commands::copy::copy_clear_clipboard_if_matched,
            commands::security::security_reveal_secret,
            commands::security::security_set_master_password,
            commands::security::security_verify_master_password,
            commands::security::security_set_strict_mode,
            commands::security::security_lock,
            commands::security::security_unlock,
            commands::pending::pending_list,
            commands::pending::pending_create,
            commands::pending::pending_get_detail,
            commands::pending::pending_update,
            commands::pending::pending_resolve_to_record,
            commands::pending::pending_delete,
            commands::backup::backup_create,
            commands::backup::backup_preview,
            commands::backup::backup_restore_overwrite,
            commands::backup::backup_list_history,
            commands::export::export_records,
            commands::settings::settings_get_all,
            commands::settings::settings_update,
            commands::settings::settings_reset,
            commands::stats::stats_get_dashboard,
            commands::health::health_run_check,
            commands::health::health_ignore_issue,
            commands::health::health_resolve_issue,
            commands::trash::trash_list,
            commands::trash::trash_empty,
            commands::system::system_open_url,
            commands::system::system_open_data_dir,
            commands::system::system_choose_file,
            commands::system::system_choose_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
