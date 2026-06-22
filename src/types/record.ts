export type RecordType =
  | 'api_relay'
  | 'api_official'
  | 'test_environment'
  | 'website_account'
  | 'license_key'
  | 'common_link';

export type RecordStatus = 'normal' | 'expired' | 'disabled' | 'pending';

export interface TagBrief {
  id: string;
  name: string;
  color?: string;
}

export interface RecordListItem {
  id: string;
  title: string;
  type: RecordType;
  folderId?: string;
  folderName?: string;
  tags: TagBrief[];
  status: RecordStatus;
  url?: string;
  baseUrl?: string;
  passwordMasked?: string;
  apiKeyMasked?: string;
  licenseKeyMasked?: string;
  username?: string;
  platformName?: string;
  projectName?: string;
  environmentName?: string;
  environmentType?: string;
  isFavorite: boolean;
  isCommon: boolean;
  isHighRisk: boolean;
  isProduction: boolean;
  hasPassword: boolean;
  hasApiKey: boolean;
  hasLicenseKey: boolean;
  expireAt?: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface CustomFieldView {
  id: string;
  name: string;
  fieldKey?: string;
  fieldType: string;
  value?: string;
  isSensitive: boolean;
  isCopyable: boolean;
  groupName?: string;
  description?: string;
  sortOrder: number;
}

export interface EnvironmentEntryView {
  id: string;
  entryName: string;
  entryType?: string;
  url: string;
  role?: string;
  username?: string;
  hasPassword: boolean;
  verificationNote?: string;
  loginSteps?: string;
  note?: string;
  sortOrder: number;
  isPrimary: boolean;
  isHighRisk: boolean;
}

export interface ModelItemView {
  id: string;
  modelName: string;
  modelType?: string;
  isDefault: boolean;
  isFavorite: boolean;
  note?: string;
  sortOrder: number;
}

export interface ApiKeyGroupView {
  id: string;
  groupName?: string;
  apiKeyMasked?: string;
  balance?: string;
  models: string[];
  sortOrder: number;
}

export interface RecordDetail {
  id: string;
  title: string;
  type: RecordType;
  folderId?: string;
  folderName?: string;
  tags: TagBrief[];
  status: RecordStatus;
  url?: string;
  baseUrl?: string;
  username?: string;
  passwordMasked?: string;
  apiKeyMasked?: string;
  licenseKeyMasked?: string;
  note?: string;
  expireAt?: string;
  priceInfo?: string;
  platformName?: string;
  projectName?: string;
  environmentName?: string;
  environmentType?: string;
  isFavorite: boolean;
  isCommon: boolean;
  isHighRisk: boolean;
  isProduction: boolean;
  isVerified: boolean;
  isPaid: boolean;
  customFields: CustomFieldView[];
  environmentEntries: EnvironmentEntryView[];
  apiKeyGroups: ApiKeyGroupView[];
  models: ModelItemView[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export type SecretUpdateAction = 'keep' | 'replace' | 'clear';

export interface SecretUpdate {
  action: SecretUpdateAction;
  value?: string;
}

export interface RecordCreateRequest {
  type: RecordType;
  title: string;
  folderId?: string;
  tagIds?: string[];
  url?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  licenseKey?: string;
  note?: string;
  expireAt?: string;
  priceInfo?: string;
  platformName?: string;
  projectName?: string;
  environmentName?: string;
  environmentType?: string;
  isFavorite?: boolean;
  isCommon?: boolean;
  isHighRisk?: boolean;
  isProduction?: boolean;
  isVerified?: boolean;
  isPaid?: boolean;
  customFields?: CustomFieldInput[];
  environmentEntries?: EnvironmentEntryInput[];
  apiKeyGroups?: ApiKeyGroupInput[];
  models?: ModelItemInput[];
}

export interface RecordUpdateRequest {
  id: string;
  title?: string;
  folderId?: string | null;
  tagIds?: string[];
  url?: string | null;
  baseUrl?: string | null;
  username?: string | null;
  passwordUpdate?: SecretUpdate;
  apiKeyUpdate?: SecretUpdate;
  licenseKeyUpdate?: SecretUpdate;
  note?: string | null;
  expireAt?: string | null;
  priceInfo?: string | null;
  platformName?: string | null;
  projectName?: string | null;
  environmentName?: string | null;
  environmentType?: string | null;
  isFavorite?: boolean;
  isCommon?: boolean;
  isHighRisk?: boolean;
  isProduction?: boolean;
  isVerified?: boolean;
  isPaid?: boolean;
  customFields?: CustomFieldInput[];
  environmentEntries?: EnvironmentEntryInput[];
  apiKeyGroups?: ApiKeyGroupInput[];
  models?: ModelItemInput[];
}

export interface CustomFieldInput {
  id?: string;
  name: string;
  fieldKey?: string;
  fieldType: string;
  value?: string;
  isSensitive?: boolean;
}

export interface EnvironmentEntryInput {
  id?: string;
  entryName: string;
  entryType?: string;
  url: string;
  role?: string;
  username?: string;
  password?: string;
  verificationNote?: string;
  loginSteps?: string;
  note?: string;
  sortOrder?: number;
  isPrimary?: boolean;
  isHighRisk?: boolean;
}

export interface ModelItemInput {
  id?: string;
  modelName: string;
  modelType?: string;
  isDefault?: boolean;
  isFavorite?: boolean;
  note?: string;
}

export interface ApiKeyGroupInput {
  id?: string;
  groupName?: string;
  apiKey?: string;
  balance?: string;
  models?: string[];
  sortOrder?: number;
}

export interface RecordListRequest {
  folderId?: string;
  tagId?: string;
  type?: RecordType;
  status?: string;
  isFavorite?: boolean;
  isCommon?: boolean;
  keyword?: string;
  sort?: 'smart' | 'updated_desc' | 'created_desc' | 'last_used_desc' | 'title_asc';
  page?: number;
  pageSize?: number;
}

export interface RecordListResponse {
  items: RecordListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// Record type display config
export const RECORD_TYPE_CONFIG: Record<RecordType, { label: string; icon: string; color: string }> = {
  api_relay: { label: 'API 中转', icon: '🔄', color: '#7C3AED' },
  api_official: { label: '官方 API', icon: '🔑', color: '#2563EB' },
  test_environment: { label: '测试环境', icon: '🖥️', color: '#F59E0B' },
  website_account: { label: '网站账号', icon: '🌐', color: '#16A34A' },
  license_key: { label: '卡密/License', icon: '📋', color: '#DC2626' },
  common_link: { label: '常用链接', icon: '🔗', color: '#0EA5E9' },
};
