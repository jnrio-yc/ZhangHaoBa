import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse } from '@/types/api';

export const systemService = {
  openUrl(url: string, recordId?: string) {
    return invoke<ApiResponse<void>>('system_open_url', { url, recordId });
  },
  openDataDir() {
    return invoke<ApiResponse<void>>('system_open_data_dir');
  },
  chooseFile(filters?: { name: string; extensions: string[] }[]) {
    return invoke<ApiResponse<{ path: string }>>('system_choose_file', { payload: { filters } });
  },
  chooseDirectory() {
    return invoke<ApiResponse<{ path: string }>>('system_choose_directory');
  },
};
