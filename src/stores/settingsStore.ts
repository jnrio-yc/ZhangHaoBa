import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  strictModeEnabled: boolean;
  locked: boolean;
  hideSensitiveByDefault: boolean;
  warnBeforeCopyHighRisk: boolean;
  clearClipboardAfterCopy: boolean;
  clipboardClearSeconds: number;
  defaultPage: string;
  defaultSort: string;
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  backupPath: string;
  backupRetentionCount: number;
  defaultExportFormat: 'excel' | 'csv';
  includeSensitiveInExportByDefault: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setStrictMode: (enabled: boolean) => void;
  setLocked: (locked: boolean) => void;
  updateSettings: (settings: Partial<Omit<SettingsState, 'setTheme' | 'setStrictMode' | 'setLocked' | 'updateSettings'>>) => void;
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      strictModeEnabled: false,
      locked: false,
      hideSensitiveByDefault: true,
      warnBeforeCopyHighRisk: true,
      clearClipboardAfterCopy: false,
      clipboardClearSeconds: 60,
      defaultPage: '/records',
      defaultSort: 'updatedAt_desc',
      autoBackupEnabled: false,
      autoBackupTime: '启动时',
      backupPath: '',
      backupRetentionCount: 10,
      defaultExportFormat: 'excel',
      includeSensitiveInExportByDefault: false,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setStrictMode: (enabled) => set({ strictModeEnabled: enabled }),
      setLocked: (locked) => set({ locked }),
      updateSettings: (settings) => {
        if (settings.theme) applyTheme(settings.theme);
        set(settings);
      },
    }),
    {
      name: 'account-vault-settings',
      partialize: (state) => ({
        theme: state.theme,
        strictModeEnabled: state.strictModeEnabled,
        hideSensitiveByDefault: state.hideSensitiveByDefault,
        warnBeforeCopyHighRisk: state.warnBeforeCopyHighRisk,
        clearClipboardAfterCopy: state.clearClipboardAfterCopy,
        clipboardClearSeconds: state.clipboardClearSeconds,
        defaultPage: state.defaultPage,
        defaultSort: state.defaultSort,
        autoBackupEnabled: state.autoBackupEnabled,
        autoBackupTime: state.autoBackupTime,
        backupPath: state.backupPath,
        backupRetentionCount: state.backupRetentionCount,
        defaultExportFormat: state.defaultExportFormat,
        includeSensitiveInExportByDefault: state.includeSensitiveInExportByDefault,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    }
  )
);

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { theme } = useSettingsStore.getState();
  if (theme === 'system') applyTheme('system');
});
