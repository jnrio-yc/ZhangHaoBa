import { create } from 'zustand';
import type { RecordListItem, RecordDetail, RecordType, RecordListRequest } from '@/types/record';

interface RecordState {
  items: RecordListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  selectedId: string | null;
  detail: RecordDetail | null;
  detailLoading: boolean;
  filters: RecordListRequest;
  setItems: (items: RecordListItem[], total: number) => void;
  setPage: (page: number) => void;
  setLoading: (loading: boolean) => void;
  setSelectedId: (id: string | null) => void;
  setDetail: (detail: RecordDetail | null) => void;
  setDetailLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<RecordListRequest>) => void;
  resetFilters: () => void;
}

const defaultFilters: RecordListRequest = {
  sort: 'smart',
  page: 1,
  pageSize: 50,
};

export const useRecordStore = create<RecordState>((set) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 50,
  loading: false,
  selectedId: null,
  detail: null,
  detailLoading: false,
  filters: { ...defaultFilters },
  setItems: (items, total) => set({ items, total }),
  setPage: (page) => set({ page }),
  setLoading: (loading) => set({ loading }),
  setSelectedId: (id) => set({ selectedId: id }),
  setDetail: (detail) => set({ detail }),
  setDetailLoading: (loading) => set({ detailLoading: loading }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
}));
