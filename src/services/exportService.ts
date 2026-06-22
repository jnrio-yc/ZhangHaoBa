import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse } from '@/types/api';

export interface ExportParams {
  filePath: string;
  format: 'excel' | 'csv';
  folderId?: string;
  recordIds?: string[];
  includeSensitive: boolean;
}

export interface ExportResult {
  filePath: string;
  recordCount: number;
  format: string;
}

export const exportService = {
  records(params: ExportParams) {
    return invoke<ApiResponse<ExportResult>>('export_records', { params });
  },
};
