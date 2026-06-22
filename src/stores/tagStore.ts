import { create } from 'zustand';
import type { TagView } from '@/types/tag';
import { isTauri, MOCK_TAGS } from '@/services/mockData';

interface TagState {
  tags: TagView[];
  selectedTagId: string | null;
  loading: boolean;
  setTags: (tags: TagView[]) => void;
  setSelectedTagId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useTagStore = create<TagState>((set) => ({
  tags: isTauri() ? [] : MOCK_TAGS,
  selectedTagId: null,
  loading: false,
  setTags: (tags) => set({ tags }),
  setSelectedTagId: (id) => set({ selectedTagId: id }),
  setLoading: (loading) => set({ loading }),
}));
