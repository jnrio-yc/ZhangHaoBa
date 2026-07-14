import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse } from '@/types/api';
import type { TagView, TagCreateRequest, TagUpdateRequest, TagMergeRequest } from '@/types/tag';
import { triggerSyncInBackground } from './syncRunner';

export const tagService = {
  list() {
    return invoke<ApiResponse<TagView[]>>('tag_list');
  },
  async create(payload: TagCreateRequest) {
    const response = await invoke<ApiResponse<string>>('tag_create', { params: payload });
    if (response.success) triggerSyncInBackground();
    return response;
  },
  async update(payload: TagUpdateRequest) {
    const response = await invoke<ApiResponse<boolean>>('tag_update', { params: payload });
    if (response.success) triggerSyncInBackground();
    return response;
  },
  async delete(id: string) {
    const response = await invoke<ApiResponse<void>>('tag_delete', { id });
    if (response.success) triggerSyncInBackground();
    return response;
  },
  merge(payload: TagMergeRequest) {
    return invoke<ApiResponse<void>>('tag_merge', { payload });
  },
};
