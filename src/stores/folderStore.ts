import { create } from 'zustand';
import type { FolderTreeItem } from '@/types/folder';
import { isTauri, MOCK_FOLDERS } from '@/services/mockData';

interface FolderState {
  folders: FolderTreeItem[];
  selectedFolderId: string | null;
  loading: boolean;
  setFolders: (folders: FolderTreeItem[]) => void;
  setSelectedFolderId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useFolderStore = create<FolderState>((set) => ({
  folders: isTauri() ? [] : MOCK_FOLDERS,
  selectedFolderId: null,
  loading: false,
  setFolders: (folders) => set({ folders }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setLoading: (loading) => set({ loading }),
}));
