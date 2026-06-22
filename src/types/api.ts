export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  detail?: string;
}

export interface SearchRequest {
  keyword: string;
  scope?: 'all' | 'folder' | 'tag' | 'trash';
  folderId?: string;
  tagId?: string;
  types?: string[];
  limit?: number;
}

export interface SearchResultItem {
  recordId: string;
  title: string;
  type: string;
  matchedFields: string[];
  matchedText?: string;
  folderName?: string;
  tags: { id: string; name: string; color?: string }[];
  url?: string;
  username?: string;
  platformName?: string;
  isFavorite: boolean;
  isCommon: boolean;
  isHighRisk: boolean;
  score: number;
}

export interface SearchResponse {
  keyword: string;
  items: SearchResultItem[];
  total: number;
}

export interface CopyFieldRequest {
  recordId: string;
  fieldKey: string;
  entryId?: string;
  customFieldId?: string;
  requireRiskConfirmed?: boolean;
}

export interface CopyFieldResponse {
  copied: boolean;
  fieldKey: string;
  isSensitive: boolean;
  isHighRisk: boolean;
  message: string;
}

export interface StatsDashboard {
  totalRecords: number;
  apiRelayCount: number;
  apiOfficialCount: number;
  testEnvironmentCount: number;
  websiteAccountCount: number;
  licenseKeyCount: number;
  commonLinkCount: number;
  pendingCount: number;
  expiringCount: number;
  highRiskCount: number;
  typeCounts: { type: string; count: number }[];
}

export interface HealthIssue {
  id: string;
  issueType: string;
  issueLevel: 'high' | 'medium' | 'low';
  title: string;
  description?: string;
  recordId?: string;
  status: 'open' | 'ignored' | 'resolved';
}

export interface HealthCheckResponse {
  summary: { totalIssues: number; high: number; medium: number; low: number };
  issues: HealthIssue[];
}

export interface SettingsView {
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
  backupPath?: string;
  backupRetentionCount: number;
  defaultExportFormat: 'excel' | 'csv';
  includeSensitiveInExportByDefault: boolean;
}

export interface AppInfo {
  version: string;
  dataDir: string;
  dbSize: number;
  recordCount: number;
  folderCount: number;
  tagCount: number;
  productName: string;
  developerId: string;
  buildSignature: string;
  copyright: string;
}

export interface PendingItem {
  id: string;
  rawText: string;
  parsedJson?: string;
  recommendedType?: string;
  confidenceLevel?: string;
  status: 'pending' | 'parsed' | 'resolved' | 'ignored';
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupHistory {
  id: string;
  backupType: string;
  filePath: string;
  fileSize?: number;
  includeSensitive: boolean;
  backupStatus: string;
  createdAt: string;
}
