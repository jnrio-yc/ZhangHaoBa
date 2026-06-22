mod migrations;

use rusqlite::Connection;
use std::path::PathBuf;

pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self, rusqlite::Error> {
        let data_dir = Self::get_data_dir();
        std::fs::create_dir_all(&data_dir).ok();

        let db_path = data_dir.join("vault.db");
        let conn = Connection::open(&db_path)?;

        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA temp_store = MEMORY;
             PRAGMA busy_timeout = 5000;"
        )?;

        let mut db = Database { conn };
        db.run_migrations()?;

        Ok(db)
    }

    pub fn get_data_dir() -> PathBuf {
        let mut path = dirs_next().unwrap_or_else(|| PathBuf::from("."));
        path.push("account-vault");
        path
    }

    fn run_migrations(&mut self) -> Result<(), rusqlite::Error> {
        migrations::run(&self.conn)
    }
}

fn dirs_next() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA").ok().map(PathBuf::from)
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME")
            .ok()
            .map(|h| PathBuf::from(h).join("Library/Application Support"))
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_DATA_HOME")
            .ok()
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var("HOME")
                    .ok()
                    .map(|h| PathBuf::from(h).join(".local/share"))
            })
    }
}
