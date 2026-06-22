import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse, BackupHistory } from '@/types/api';

export interface BackupResult {
  filePath: string;
  fileSize: number;
  recordCount: number;
}

export const backupService = {
  create(filePath: string, includeSensitive = true) {
    return invoke<ApiResponse<BackupResult>>('backup_create', {
      params: { filePath, includeSensitive },
    });
  },
  preview(filePath: string) {
    return invoke<ApiResponse<unknown>>('backup_preview', { filePath });
  },
  restoreOverwrite(filePath: string) {
    return invoke<ApiResponse<boolean>>('backup_restore_overwrite', { filePath });
  },
  listHistory() {
    return invoke<ApiResponse<BackupHistory[]>>('backup_list_history');
  },
};
