import type { RecordListItem, RecordDetail, RecordType } from '@/types/record';
import type { StatsDashboard, PendingItem, BackupHistory } from '@/types/api';
import type { FolderTreeItem } from '@/types/folder';
import type { TagView } from '@/types/tag';

const now = new Date().toISOString();
const hour = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const day = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

export const MOCK_FOLDERS: FolderTreeItem[] = [
  { id: 'f1', name: 'API', icon: 'briefcase', color: '#EA580C', sortOrder: 0, recordCount: 15, isCommon: false, isArchived: false, children: [] },
  { id: 'f2', name: '工作', icon: 'briefcase', color: '#10B981', sortOrder: 1, recordCount: 12, isCommon: false, isArchived: false, children: [] },
  { id: 'f3', name: '测试环境', icon: 'monitor', color: '#3B82F6', sortOrder: 2, recordCount: 6, isCommon: false, isArchived: false, children: [] },
  { id: 'f4', name: '个人', icon: 'user', color: '#8B5CF6', sortOrder: 3, recordCount: 8, isCommon: false, isArchived: false, children: [] },
];

export const MOCK_TAGS: TagView[] = [
  { id: 't1', name: '大模型', color: '#7C3AED', groupKey: 'custom', usageCount: 6, sortOrder: 0, isSystem: false },
  { id: 't2', name: '常用', color: '#78716C', groupKey: 'usage', usageCount: 8, sortOrder: 1, isSystem: false },
  { id: 't3', name: '付费', color: '#EA580C', groupKey: 'status', usageCount: 5, sortOrder: 2, isSystem: false },
  { id: 't4', name: '测试', color: '#F59E0B', groupKey: 'usage', usageCount: 4, sortOrder: 3, isSystem: false },
  { id: 't5', name: 'OpenAI', color: '#10B981', groupKey: 'custom', usageCount: 3, sortOrder: 4, isSystem: false },
  { id: 't6', name: '即将过期', color: '#D97706', groupKey: 'status', usageCount: 2, sortOrder: 5, isSystem: false },
  { id: 't7', name: '已验证', color: '#059669', groupKey: 'status', usageCount: 4, sortOrder: 6, isSystem: false },
  { id: 't8', name: '工作', color: '#3B82F6', groupKey: 'custom', usageCount: 5, sortOrder: 7, isSystem: false },
];

export const MOCK_RECORDS: RecordListItem[] = [
  {
    id: 'r1', title: 'DeepSeek 中转', type: 'api_relay', folderId: 'f1', folderName: 'API',
    tags: [{ id: 't3', name: '付费', color: '#EA580C' }, { id: 't1', name: '大模型', color: '#7C3AED' }],
    status: 'normal', baseUrl: 'https://api.deepseek.com/v1', isFavorite: true, isCommon: true,
    isHighRisk: false, isProduction: false, hasPassword: false, hasApiKey: true, hasLicenseKey: false,
    updatedAt: hour(2), lastUsedAt: hour(2),
  },
  {
    id: 'r2', title: 'OpenAI 官方 API', type: 'api_official', folderId: 'f1', folderName: 'API',
    tags: [{ id: 't3', name: '付费', color: '#EA580C' }],
    status: 'normal', baseUrl: 'https://api.openai.com/v1', platformName: 'OpenAI',
    isFavorite: false, isCommon: true, isHighRisk: false, isProduction: true,
    hasPassword: false, hasApiKey: true, hasLicenseKey: false,
    updatedAt: hour(4), lastUsedAt: hour(1),
  },
  {
    id: 'r3', title: '门诊随访系统-测试', type: 'test_environment', folderId: 'f2', folderName: '工作',
    tags: [{ id: 't8', name: '工作', color: '#3B82F6' }],
    status: 'normal', url: 'https://follow-up.example.com',
    environmentName: '门诊随访', environmentType: 'staging',
    isFavorite: false, isCommon: false, isHighRisk: false, isProduction: false,
    hasPassword: true, hasApiKey: false, hasLicenseKey: false,
    updatedAt: hour(6), lastUsedAt: hour(3),
  },
  {
    id: 'r4', title: 'Claude API', type: 'api_official', folderId: 'f1', folderName: 'API',
    tags: [{ id: 't3', name: '付费', color: '#EA580C' }, { id: 't2', name: '常用', color: '#78716C' }],
    status: 'normal', baseUrl: 'https://api.anthropic.com', platformName: 'Anthropic',
    isFavorite: true, isCommon: true, isHighRisk: false, isProduction: true,
    hasPassword: false, hasApiKey: true, hasLicenseKey: false,
    updatedAt: hour(8), lastUsedAt: hour(1),
  },
  {
    id: 'r5', title: '阿里云控制台', type: 'website_account', folderId: 'f2', folderName: '工作',
    tags: [],
    status: 'normal', url: 'https://console.aliyun.com', username: 'yangchao', platformName: '阿里云',
    isFavorite: false, isCommon: false, isHighRisk: false, isProduction: false,
    hasPassword: true, hasApiKey: false, hasLicenseKey: false,
    updatedAt: day(1), lastUsedAt: day(0),
  },
  {
    id: 'r6', title: 'Cursor License', type: 'license_key', folderId: 'f4', folderName: '个人',
    tags: [{ id: 't6', name: '即将过期', color: '#D97706' }],
    status: 'normal', platformName: 'Cursor',
    expireAt: new Date(Date.now() + 15 * 86400000).toISOString(),
    isFavorite: false, isCommon: false, isHighRisk: false, isProduction: false,
    hasPassword: false, hasApiKey: false, hasLicenseKey: true,
    updatedAt: day(2), lastUsedAt: day(1),
  },
  {
    id: 'r7', title: '喝一杯小程序-测试', type: 'test_environment', folderId: 'f2', folderName: '工作',
    tags: [],
    status: 'normal', url: 'https://heyibei-test.example.com',
    environmentName: '喝一杯', environmentType: 'staging',
    isFavorite: false, isCommon: false, isHighRisk: false, isProduction: false,
    hasPassword: true, hasApiKey: false, hasLicenseKey: false,
    updatedAt: day(3), lastUsedAt: day(2),
  },
  {
    id: 'r8', title: '录个音后台', type: 'common_link', folderId: 'f2', folderName: '工作',
    tags: [],
    status: 'normal', url: 'https://admin.lugeyinyue.com',
    isFavorite: false, isCommon: true, isHighRisk: false, isProduction: true,
    hasPassword: false, hasApiKey: false, hasLicenseKey: false,
    updatedAt: day(4), lastUsedAt: day(1),
  },
  {
    id: 'r9', title: 'GitHub Enterprise', type: 'website_account', folderId: 'f4', folderName: '个人',
    tags: [{ id: 't2', name: '常用', color: '#78716C' }],
    status: 'normal', url: 'https://github.com', username: 'yangchao-dev', platformName: 'GitHub',
    isFavorite: true, isCommon: true, isHighRisk: false, isProduction: false,
    hasPassword: true, hasApiKey: false, hasLicenseKey: false,
    updatedAt: day(1), lastUsedAt: hour(3),
  },
  {
    id: 'r10', title: 'Vercel 部署', type: 'website_account', folderId: 'f4', folderName: '个人',
    tags: [{ id: 't7', name: '已验证', color: '#059669' }],
    status: 'normal', url: 'https://vercel.com', username: 'yangchao', platformName: 'Vercel',
    isFavorite: false, isCommon: false, isHighRisk: false, isProduction: false,
    hasPassword: true, hasApiKey: false, hasLicenseKey: false,
    updatedAt: day(5), lastUsedAt: day(3),
  },
  {
    id: 'r11', title: 'one-api 中转站', type: 'api_relay', folderId: 'f1', folderName: 'API',
    tags: [{ id: 't4', name: '测试', color: '#F59E0B' }],
    status: 'normal', baseUrl: 'https://oneapi.example.com/v1',
    isFavorite: false, isCommon: false, isHighRisk: false, isProduction: false,
    hasPassword: false, hasApiKey: true, hasLicenseKey: false,
    updatedAt: day(2), lastUsedAt: day(1),
  },
  {
    id: 'r12', title: 'Grafana 监控面板', type: 'common_link', folderId: 'f2', folderName: '工作',
    tags: [{ id: 't8', name: '工作', color: '#3B82F6' }],
    status: 'normal', url: 'https://grafana.example.com/d/main',
    isFavorite: false, isCommon: true, isHighRisk: false, isProduction: true,
    hasPassword: false, hasApiKey: false, hasLicenseKey: false,
    updatedAt: day(6), lastUsedAt: day(1),
  },
  {
    id: 'r13', title: 'Notion 团队空间', type: 'website_account', folderId: 'f4', folderName: '个人',
    tags: [{ id: 't2', name: '常用', color: '#78716C' }],
    status: 'normal', url: 'https://notion.so', username: 'team@company.com', platformName: 'Notion',
    isFavorite: false, isCommon: true, isHighRisk: false, isProduction: false,
    hasPassword: true, hasApiKey: false, hasLicenseKey: false,
    updatedAt: day(4), lastUsedAt: day(0),
  },
];

export const MOCK_RECORD_DETAIL: RecordDetail = {
  id: 'r1', title: 'DeepSeek 中转', type: 'api_relay', folderId: 'f1', folderName: 'API',
  tags: [{ id: 't3', name: '付费', color: '#EA580C' }, { id: 't1', name: '大模型', color: '#7C3AED' }, { id: 't2', name: '常用', color: '#78716C' }],
  status: 'normal', baseUrl: 'https://api.deepseek.com/v1',
  apiKeyMasked: 'sk-7f2a••••••••••••••••',
  note: '主力中转，按量计费',
  priceInfo: '¥50 余额 · 按量计费',
  isFavorite: true, isCommon: true, isHighRisk: false, isProduction: false,
  isVerified: true, isPaid: true,
  customFields: [
    { id: 'cf1', name: '速率限制', fieldType: 'text', value: '60 req/min', isSensitive: false, isCopyable: true, sortOrder: 0 },
  ],
  environmentEntries: [],
  apiKeyGroups: [],
  models: [
    { id: 'm1', modelName: 'deepseek-chat', modelType: 'chat', isDefault: true, isFavorite: true, sortOrder: 0 },
    { id: 'm2', modelName: 'deepseek-reasoner', modelType: 'chat', isDefault: false, isFavorite: true, sortOrder: 1 },
    { id: 'm3', modelName: 'deepseek-coder', modelType: 'chat', isDefault: false, isFavorite: false, sortOrder: 2 },
  ],
  createdAt: day(30), updatedAt: hour(2), lastUsedAt: hour(2),
};

export const MOCK_STATS: StatsDashboard = {
  totalRecords: 41,
  apiRelayCount: 15,
  apiOfficialCount: 8,
  testEnvironmentCount: 6,
  websiteAccountCount: 7,
  licenseKeyCount: 2,
  commonLinkCount: 3,
  pendingCount: 0,
  expiringCount: 1,
  highRiskCount: 1,
  typeCounts: [],
};

export const MOCK_PENDING: PendingItem[] = [];

export function isTauri(): boolean {
  return !!(window as any).__TAURI__;
}
