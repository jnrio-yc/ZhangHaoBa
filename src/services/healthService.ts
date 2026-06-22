import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse, HealthCheckResponse } from '@/types/api';

export const healthService = {
  runCheck() {
    return invoke<ApiResponse<HealthCheckResponse>>('health_run_check');
  },
  ignoreIssue(issueId: string, reason?: string) {
    return invoke<ApiResponse<void>>('health_ignore_issue', { payload: { issueId, reason } });
  },
  resolveIssue(issueId: string) {
    return invoke<ApiResponse<void>>('health_resolve_issue', { issueId });
  },
};
