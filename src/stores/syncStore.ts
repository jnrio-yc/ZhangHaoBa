import { create } from 'zustand';

interface SyncState {
  isSignedIn: boolean;
  userEmail: string | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  setSignedIn: (email: string | null) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncedAt: (timestamp: string | null) => void;
  setLastSyncError: (message: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSignedIn: false,
  userEmail: null,
  isSyncing: false,
  lastSyncedAt: null,
  lastSyncError: null,
  setSignedIn: (email) => set({ isSignedIn: !!email, userEmail: email }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
  setLastSyncError: (message) => set({ lastSyncError: message }),
}));
