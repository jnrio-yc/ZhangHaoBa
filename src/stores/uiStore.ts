import { create } from 'zustand';

interface UIState {
  searchOpen: boolean;
  createRecordOpen: boolean;
  editRecordId: string | null;
  sidebarCollapsed: boolean;
  rightPanelOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  setCreateRecordOpen: (open: boolean) => void;
  setEditRecordId: (id: string | null) => void;
  toggleSidebar: () => void;
  setRightPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchOpen: false,
  createRecordOpen: false,
  editRecordId: null,
  sidebarCollapsed: false,
  rightPanelOpen: true,
  setSearchOpen: (open) => set({ searchOpen: open }),
  setCreateRecordOpen: (open) => set({ createRecordOpen: open }),
  setEditRecordId: (id) => set({ editRecordId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
}));
