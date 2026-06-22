use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("数据库错误: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("参数校验失败: {0}")]
    Validation(String),

    #[error("记录不存在")]
    RecordNotFound,

    #[error("文件夹不存在")]
    FolderNotFound,

    #[error("标签不存在")]
    TagNotFound,

    #[error("加密失败: {0}")]
    EncryptFailed(String),

    #[error("解密失败: {0}")]
    DecryptFailed(String),

    #[error("剪贴板写入失败: {0}")]
    ClipboardError(String),

    #[error("备份失败: {0}")]
    BackupFailed(String),

    #[error("恢复失败: {0}")]
    RestoreFailed(String),

    #[error("导出失败: {0}")]
    ExportFailed(String),

    #[error("权限不足")]
    PermissionDenied,

    #[error("严格模式未解锁")]
    StrictModeLocked,

    #[error("无效备份文件")]
    InvalidBackupFile,

    #[error("名称重复: {0}")]
    DuplicateName(String),

    #[error("IO错误: {0}")]
    Io(#[from] std::io::Error),

    #[error("未知错误: {0}")]
    Unknown(String),
}

#[derive(Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub detail: Option<String>,
}

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<ApiError>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        ApiResponse {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(code: &str, message: &str) -> Self {
        ApiResponse {
            success: false,
            data: None,
            error: Some(ApiError {
                code: code.to_string(),
                message: message.to_string(),
                detail: None,
            }),
        }
    }

    pub fn from_error(e: AppError) -> Self {
        let (code, message) = match &e {
            AppError::Database(_) => ("DATABASE_ERROR", e.to_string()),
            AppError::Validation(_) => ("VALIDATION_ERROR", e.to_string()),
            AppError::RecordNotFound => ("RECORD_NOT_FOUND", "记录不存在或已被删除".to_string()),
            AppError::FolderNotFound => ("FOLDER_NOT_FOUND", "文件夹不存在".to_string()),
            AppError::TagNotFound => ("TAG_NOT_FOUND", "标签不存在".to_string()),
            AppError::EncryptFailed(_) => ("ENCRYPT_FAILED", e.to_string()),
            AppError::DecryptFailed(_) => ("DECRYPT_FAILED", e.to_string()),
            AppError::ClipboardError(_) => ("CLIPBOARD_ERROR", e.to_string()),
            AppError::BackupFailed(_) => ("BACKUP_FAILED", e.to_string()),
            AppError::RestoreFailed(_) => ("RESTORE_FAILED", e.to_string()),
            AppError::ExportFailed(_) => ("EXPORT_FAILED", e.to_string()),
            AppError::PermissionDenied => ("PERMISSION_DENIED", "权限不足".to_string()),
            AppError::StrictModeLocked => ("STRICT_MODE_LOCKED", "严格模式未解锁".to_string()),
            AppError::InvalidBackupFile => ("INVALID_BACKUP_FILE", "无效备份文件".to_string()),
            AppError::DuplicateName(_) => ("DUPLICATE_NAME", e.to_string()),
            AppError::Io(_) => ("IO_ERROR", e.to_string()),
            AppError::Unknown(_) => ("UNKNOWN_ERROR", e.to_string()),
        };
        ApiResponse::err(code, &message)
    }
}
