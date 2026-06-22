import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse, SettingsView } from '@/types/api';

export const settingsService = {
  getAll() {
    return invoke<ApiResponse<SettingsView>>('settings_get_all');
  },
  update(key: string, value: string | number | boolean) {
    return invoke<ApiResponse<void>>('settings_update', { payload: { key, value: String(value) } });
  },
  reset() {
    return invoke<ApiResponse<void>>('settings_reset');
  },
};
