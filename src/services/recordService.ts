import type { ApiResponse } from '@/types/api';
import type {
  RecordListRequest,
  RecordListResponse,
  RecordDetail,
  RecordCreateRequest,
  RecordUpdateRequest,
  RecordType,
} from '@/types/record';
import { isTauri, MOCK_RECORDS, MOCK_RECORD_DETAIL } from './mockData';

async function tauriInvoke<T>(cmd: string, args?: any): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/tauri');
  return invoke<T>(cmd, args);
}

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function normalizeListItem(item: any): RecordListResponse['items'][number] {
  const tagIds: string[] = item.tagIds ?? item.tag_ids ?? [];
  const tagNames: string[] = item.tagNames ?? item.tag_names ?? [];
  return {
    ...item,
    folderId: item.folderId ?? item.folder_id,
    folderName: item.folderName ?? item.folder_name,
    baseUrl: item.baseUrl ?? item.base_url,
    passwordMasked: item.passwordMasked ?? item.password_masked,
    apiKeyMasked: item.apiKeyMasked ?? item.api_key_masked,
    licenseKeyMasked: item.licenseKeyMasked ?? item.license_key_masked,
    platformName: item.platformName ?? item.platform_name,
    projectName: item.projectName ?? item.project_name,
    environmentName: item.environmentName ?? item.environment_name,
    isFavorite: item.isFavorite ?? item.is_favorite ?? false,
    isCommon: item.isCommon ?? item.is_common ?? false,
    isHighRisk: item.isHighRisk ?? item.is_high_risk ?? false,
    isProduction: item.isProduction ?? item.is_production ?? false,
    hasPassword: item.hasPassword ?? item.has_password ?? false,
    hasApiKey: item.hasApiKey ?? item.has_api_key ?? false,
    hasLicenseKey: item.hasLicenseKey ?? item.has_license_key ?? false,
    expireAt: item.expireAt ?? item.expire_at,
    updatedAt: item.updatedAt ?? item.updated_at,
    lastUsedAt: item.lastUsedAt ?? item.last_used_at,
    tags: item.tags ?? tagIds.map((id, index) => ({
      id,
      name: tagNames[index] ?? id,
    })),
  };
}

function normalizeDetail(item: any): RecordDetail {
  return {
    ...item,
    folderId: item.folderId ?? item.folder_id,
    folderName: item.folderName ?? item.folder_name,
    baseUrl: item.baseUrl ?? item.base_url,
    passwordMasked: item.passwordMasked ?? item.password_masked,
    apiKeyMasked: item.apiKeyMasked ?? item.api_key_masked,
    licenseKeyMasked: item.licenseKeyMasked ?? item.license_key_masked,
    expireAt: item.expireAt ?? item.expire_at,
    priceInfo: item.priceInfo ?? item.price_info,
    platformName: item.platformName ?? item.platform_name,
    projectName: item.projectName ?? item.project_name,
    environmentName: item.environmentName ?? item.environment_name,
    environmentType: item.environmentType ?? item.environment_type,
    isFavorite: item.isFavorite ?? item.is_favorite ?? false,
    isCommon: item.isCommon ?? item.is_common ?? false,
    isHighRisk: item.isHighRisk ?? item.is_high_risk ?? false,
    isProduction: item.isProduction ?? item.is_production ?? false,
    isVerified: item.isVerified ?? item.is_verified ?? false,
    isPaid: item.isPaid ?? item.is_paid ?? false,
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
    lastUsedAt: item.lastUsedAt ?? item.last_used_at,
    tags: item.tags ?? [],
    customFields: item.customFields ?? item.custom_fields ?? [],
    environmentEntries: item.environmentEntries ?? item.environment_entries ?? [],
    apiKeyGroups: item.apiKeyGroups ?? item.api_key_groups ?? [],
    models: item.models ?? [],
  };
}

export const recordService = {
  async list(params: RecordListRequest): Promise<ApiResponse<RecordListResponse>> {
    if (!isTauri()) {
      let items = [...MOCK_RECORDS];
      if (params.type) items = items.filter((r) => r.type === params.type);
      if (params.folderId) items = items.filter((r) => r.folderId === params.folderId);
      if (params.tagId) items = items.filter((r) => r.tags.some((t) => t.id === params.tagId));
      if (params.isFavorite) items = items.filter((r) => r.isFavorite);
      if (params.keyword) {
        const kw = params.keyword.toLowerCase();
        items = items.filter((r) => r.title.toLowerCase().includes(kw) || r.url?.toLowerCase().includes(kw) || r.baseUrl?.toLowerCase().includes(kw));
      }
      if (params.sort === 'title_asc') items.sort((a, b) => a.title.localeCompare(b.title));
      else if (params.sort === 'last_used_desc') items.sort((a, b) => (b.lastUsedAt || '').localeCompare(a.lastUsedAt || ''));
      else items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const page = params.page || 1;
      const pageSize = params.pageSize || 20;
      const start = (page - 1) * pageSize;
      return ok({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize });
    }
    const response = await tauriInvoke<ApiResponse<any>>('record_list', { params });
    if (!response.success || !response.data) return response;
    return {
      ...response,
      data: {
        ...response.data,
        pageSize: response.data.pageSize ?? response.data.page_size ?? params.pageSize ?? 50,
        items: (response.data.items ?? []).map(normalizeListItem),
      },
    };
  },

  async getDetail(id: string): Promise<ApiResponse<RecordDetail>> {
    if (!isTauri()) {
      const item = MOCK_RECORDS.find((r) => r.id === id);
      if (!item) return { success: false, data: null as any, error: { code: 'NOT_FOUND', message: '记录不存在' } };
      const detail: RecordDetail = {
        ...MOCK_RECORD_DETAIL,
        id: item.id, title: item.title, type: item.type,
        folderId: item.folderId, folderName: item.folderName,
        tags: item.tags, status: item.status,
        url: item.url, baseUrl: item.baseUrl,
        username: item.username, platformName: item.platformName,
        projectName: item.projectName,
        environmentName: item.environmentName, environmentType: item.environmentType,
        isFavorite: item.isFavorite, isCommon: item.isCommon,
        isHighRisk: item.isHighRisk, isProduction: item.isProduction,
        passwordMasked: item.hasPassword ? '••••••••' : undefined,
        apiKeyMasked: item.hasApiKey ? 'sk-••••••••••••' : undefined,
        licenseKeyMasked: item.hasLicenseKey ? 'XXXX-XXXX-••••-••••' : undefined,
        updatedAt: item.updatedAt, lastUsedAt: item.lastUsedAt,
        models: item.type === 'api_relay' || item.type === 'api_official' ? MOCK_RECORD_DETAIL.models : [],
        apiKeyGroups: [],
        environmentEntries: item.type === 'test_environment' ? [
          { id: 'e1', entryName: '主入口', entryType: 'web', url: item.url || '', role: 'admin', username: item.username, hasPassword: true, isPrimary: true, isHighRisk: item.isHighRisk, sortOrder: 0 },
        ] : [],
        customFields: MOCK_RECORD_DETAIL.customFields.slice(0, 1),
      };
      return ok(detail);
    }
    const response = await tauriInvoke<ApiResponse<any>>('record_get_detail', { id });
    if (!response.success || !response.data) return response;
    return { ...response, data: normalizeDetail(response.data) };
  },

  async create(payload: RecordCreateRequest): Promise<ApiResponse<{ id: string }>> {
    if (!isTauri()) return ok({ id: 'new-' + Date.now() });
    const response = await tauriInvoke<ApiResponse<string>>('record_create', { params: payload });
    if (!response.success || !response.data) {
      return response as unknown as ApiResponse<{ id: string }>;
    }
    return { ...response, data: { id: response.data } };
  },

  async update(payload: RecordUpdateRequest): Promise<ApiResponse<void>> {
    if (!isTauri()) return ok(undefined as any);
    const params = {
      ...payload,
      password: payload.passwordUpdate?.action === 'replace' ? payload.passwordUpdate.value : undefined,
      apiKey: payload.apiKeyUpdate?.action === 'replace' ? payload.apiKeyUpdate.value : undefined,
      licenseKey: payload.licenseKeyUpdate?.action === 'replace' ? payload.licenseKeyUpdate.value : undefined,
      passwordUpdate: undefined,
      apiKeyUpdate: undefined,
      licenseKeyUpdate: undefined,
    };
    return tauriInvoke('record_update', { params });
  },

  async delete(id: string): Promise<ApiResponse<{ id: string; deletedAt: string }>> {
    if (!isTauri()) return ok({ id, deletedAt: new Date().toISOString() });
    return tauriInvoke('record_delete', { id });
  },

  async restore(payload: { id: string; targetFolderId?: string }): Promise<ApiResponse<void>> {
    if (!isTauri()) return ok(undefined as any);
    return tauriInvoke('record_restore', { id: payload.id });
  },

  async permanentDelete(id: string): Promise<ApiResponse<void>> {
    if (!isTauri()) return ok(undefined as any);
    return tauriInvoke('record_permanent_delete', { id });
  },

  async toggleFavorite(id: string, value: boolean): Promise<ApiResponse<boolean>> {
    if (!isTauri()) return ok(value);
    return tauriInvoke('record_toggle_favorite', { id, value });
  },

  async toggleCommon(id: string, value: boolean): Promise<ApiResponse<boolean>> {
    if (!isTauri()) return ok(value);
    return tauriInvoke('record_toggle_common', { id, value });
  },
};
