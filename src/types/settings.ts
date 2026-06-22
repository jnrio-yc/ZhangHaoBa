export interface AppSettings {
  defaultPage: string;
  defaultSort: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  strictModeEnabled: boolean;
  hideSensitiveByDefault: boolean;
  warnBeforeCopyHighRisk: boolean;
  clearClipboardAfterCopy: boolean;
  clipboardClearSeconds: number;
  autoBackupEnabled: boolean;
  autoBackupTime?: string;
  backupPath?: string;
  backupRetentionCount: number;
  defaultExportFormat: 'excel' | 'csv';
  includeSensitiveInExportByDefault: boolean;
}
