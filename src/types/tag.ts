export type TagGroupKey = 'platform' | 'status' | 'usage' | 'risk' | 'project' | 'custom';

export interface TagView {
  id: string;
  name: string;
  color?: string;
  groupKey: TagGroupKey;
  sortOrder: number;
  isSystem: boolean;
  usageCount: number;
}

export interface TagCreateRequest {
  name: string;
  color?: string;
  groupKey?: TagGroupKey;
  sortOrder?: number;
}

export interface TagUpdateRequest {
  id: string;
  name?: string;
  color?: string;
  groupKey?: string;
  sortOrder?: number;
}

export interface TagMergeRequest {
  sourceTagId: string;
  targetTagId: string;
  deleteSourceAfterMerge: boolean;
}

export const TAG_GROUP_CONFIG: Record<TagGroupKey, { label: string; color: string }> = {
  platform: { label: '平台', color: '#7C3AED' },
  status: { label: '状态', color: '#16A34A' },
  usage: { label: '用途', color: '#2563EB' },
  risk: { label: '风险', color: '#DC2626' },
  project: { label: '项目', color: '#F59E0B' },
  custom: { label: '自定义', color: '#6B7280' },
};
