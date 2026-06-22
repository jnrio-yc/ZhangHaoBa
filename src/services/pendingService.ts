import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse, PendingItem } from '@/types/api';
import type { RecordCreateRequest } from '@/types/record';

export const pendingService = {
  list() {
    return invoke<ApiResponse<PendingItem[]>>('pending_list');
  },
  create(payload: { rawText: string; source?: string }) {
    return invoke<ApiResponse<{ id: string }>>('pending_create', { payload });
  },
  getDetail(id: string) {
    return invoke<ApiResponse<PendingItem>>('pending_get_detail', { id });
  },
  resolveToRecord(pendingId: string, record: RecordCreateRequest) {
    return invoke<ApiResponse<{ id: string }>>('pending_resolve_to_record', { payload: { pendingId, record } });
  },
  delete(id: string) {
    return invoke<ApiResponse<void>>('pending_delete', { id });
  },
};
