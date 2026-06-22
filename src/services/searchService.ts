import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse, SearchRequest, SearchResponse } from '@/types/api';

export const searchService = {
  query(payload: SearchRequest) {
    return invoke<ApiResponse<SearchResponse>>('search_query', { payload });
  },
  rebuildIndex() {
    return invoke<ApiResponse<void>>('search_rebuild_index');
  },
  parseCommand(keyword: string) {
    return invoke<ApiResponse<any>>('search_parse_command', { keyword });
  },
};
