import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse } from '@/types/api';
import type { TagView, TagCreateRequest, TagUpdateRequest, TagMergeRequest } from '@/types/tag';

export const tagService = {
  list() {
    return invoke<ApiResponse<TagView[]>>('tag_list');
  },
  create(payload: TagCreateRequest) {
    return invoke<ApiResponse<string>>('tag_create', { params: payload });
  },
  update(payload: TagUpdateRequest) {
    return invoke<ApiResponse<boolean>>('tag_update', { params: payload });
  },
  delete(id: string) {
    return invoke<ApiResponse<void>>('tag_delete', { id });
  },
  merge(payload: TagMergeRequest) {
    return invoke<ApiResponse<void>>('tag_merge', { payload });
  },
};
