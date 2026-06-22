import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse } from '@/types/api';
import type { RecordListItem } from '@/types/record';

export const trashService = {
  list(params?: { keyword?: string; page?: number; pageSize?: number }) {
    return invoke<ApiResponse<{ items: RecordListItem[]; total: number }>>('trash_list', { payload: params || {} });
  },
  empty(confirmText: string) {
    return invoke<ApiResponse<void>>('trash_empty', { payload: { confirmText } });
  },
};
