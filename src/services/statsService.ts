import type { ApiResponse, StatsDashboard } from '@/types/api';
import { isTauri, MOCK_STATS } from './mockData';

export const statsService = {
  async getDashboard(): Promise<ApiResponse<StatsDashboard>> {
    if (!isTauri()) return { success: true, data: MOCK_STATS };
    const { invoke } = await import('@tauri-apps/api/tauri');
    return invoke<ApiResponse<StatsDashboard>>('stats_get_dashboard');
  },
};
