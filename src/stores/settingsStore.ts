import { create } from 'zustand';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  strictModeEnabled: boolean;
  locked: boolean;
  hideSensitiveByDefault: boolean;
  warnBeforeCopyHighRisk: boolean;
  clearClipboardAfterCopy: boolean;
  clipboardClearSeconds: number;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setStrictMode: (enabled: boolean) => void;
  setLocked: (locked: boolean) => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'light',
  strictModeEnabled: false,
  locked: false,
  hideSensitiveByDefault: true,
  warnBeforeCopyHighRisk: true,
  clearClipboardAfterCopy: false,
  clipboardClearSeconds: 60,
  setTheme: (theme) => set({ theme }),
  setStrictMode: (enabled) => set({ strictModeEnabled: enabled }),
  setLocked: (locked) => set({ locked }),
  updateSettings: (settings) => set(settings),
}));
