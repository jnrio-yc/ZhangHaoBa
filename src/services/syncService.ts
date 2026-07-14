import { invoke } from '@tauri-apps/api/tauri';
import { isTauri } from './mockData';
import type { ApiResponse } from '@/types/api';
import type { SyncConfigView, SyncSession } from '@/types/sync';

const SYNC_TABLES = [
  'folders',
  'tags',
  'records',
  'custom_fields',
  'environment_entries',
  'record_models',
  'api_key_groups',
] as const;

const PAGE_SIZE = 500;

/** Dual-mode HTTP request, mirrors apiProbeService.ts's httpGet pattern. */
async function httpRequest(
  url: string,
  init: { method: string; headers: Record<string, string>; body?: unknown }
): Promise<{ status: number; data: any }> {
  if (isTauri()) {
    const { fetch: tauriFetch, ResponseType, Body } = await import('@tauri-apps/api/http');
    const resp = await tauriFetch(url, {
      method: init.method as any,
      headers: init.headers,
      body: init.body !== undefined ? Body.json(init.body as any) : undefined,
      timeout: 30,
      responseType: ResponseType.JSON,
    });
    return { status: resp.status, data: resp.data };
  }
  const resp = await fetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await resp.json().catch(() => null);
  return { status: resp.status, data };
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export interface SignInResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

async function signIn(supabaseUrl: string, anonKey: string, email: string, password: string): Promise<SignInResult> {
  const url = `${normalizeUrl(supabaseUrl)}/auth/v1/token?grant_type=password`;
  const { status, data } = await httpRequest(url, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: { email, password },
  });
  if (status >= 400 || !data?.access_token) {
    throw new Error(data?.error_description || data?.msg || '登录失败，请检查邮箱、密码或 Supabase 配置');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    userId: data.user?.id,
    email: data.user?.email || email,
  };
}

async function refreshSession(supabaseUrl: string, anonKey: string, refreshToken: string): Promise<SignInResult> {
  const url = `${normalizeUrl(supabaseUrl)}/auth/v1/token?grant_type=refresh_token`;
  const { status, data } = await httpRequest(url, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: { refresh_token: refreshToken },
  });
  if (status >= 400 || !data?.access_token) {
    throw new Error('登录状态已过期，请重新登录');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    userId: data.user?.id,
    email: data.user?.email,
  };
}

async function pushTable(
  supabaseUrl: string,
  anonKey: string,
  accessToken: string,
  userId: string,
  table: string,
  rows: any[]
): Promise<void> {
  if (rows.length === 0) return;
  const stamped = rows.map((r) => ({ ...r, user_id: userId }));
  const url = `${normalizeUrl(supabaseUrl)}/rest/v1/${table}?on_conflict=id`;
  for (let i = 0; i < stamped.length; i += PAGE_SIZE) {
    const chunk = stamped.slice(i, i + PAGE_SIZE);
    const { status, data } = await httpRequest(url, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: chunk,
    });
    if (status >= 400) {
      throw new Error(`推送 ${table} 失败: ${data?.message || status}`);
    }
  }
}

async function pullTable(
  supabaseUrl: string,
  anonKey: string,
  accessToken: string,
  userId: string,
  table: string,
  since: string | null
): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams();
    params.set('user_id', `eq.${userId}`);
    if (since) params.set('updated_at', `gt.${since}`);
    params.set('order', 'updated_at.asc');
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    const url = `${normalizeUrl(supabaseUrl)}/rest/v1/${table}?${params.toString()}`;
    const { status, data } = await httpRequest(url, {
      method: 'GET',
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    });
    if (status >= 400) {
      throw new Error(`拉取 ${table} 失败: ${(data && data.message) || status}`);
    }
    const rows: any[] = Array.isArray(data) ? data : [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

export const syncService = {
  getConfig() {
    return invoke<ApiResponse<SyncConfigView>>('sync_get_config');
  },
  setConfig(supabaseUrl: string, supabaseAnonKey: string) {
    return invoke<ApiResponse<boolean>>('sync_set_config', {
      params: { supabaseUrl, supabaseAnonKey },
    });
  },
  loadSession() {
    return invoke<ApiResponse<SyncSession | null>>('sync_load_session');
  },
  clearSession() {
    return invoke<ApiResponse<boolean>>('sync_clear_session');
  },

  async signIn(supabaseUrl: string, anonKey: string, email: string, password: string) {
    const result = await signIn(supabaseUrl, anonKey, email, password);
    await invoke<ApiResponse<boolean>>('sync_save_session', {
      params: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        email: result.email,
        userId: result.userId,
      },
    });
    return result;
  },

  /** Push local changes since the watermark, then pull remote changes, then advance the watermark. */
  async runSync(): Promise<{ pushed: Record<string, number>; pulled: Record<string, number> }> {
    const configRes = await this.getConfig();
    const config = configRes.data;
    if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
      throw new Error('尚未配置 Supabase 项目');
    }

    const sessionRes = await this.loadSession();
    let session = sessionRes.data;
    if (!session) {
      throw new Error('尚未登录');
    }

    // Refresh the access token proactively; Supabase tokens are short-lived
    // and there is no local expiry tracking, so just always refresh once
    // before a sync run (cheap and avoids a stale-token retry dance).
    try {
      const refreshed = await refreshSession(config.supabaseUrl, config.supabaseAnonKey, session.refreshToken);
      await invoke<ApiResponse<boolean>>('sync_save_session', {
        params: {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          email: refreshed.email || session.email,
          userId: refreshed.userId || session.userId,
        },
      });
      session = { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, email: refreshed.email || session.email, userId: refreshed.userId || session.userId };
    } catch {
      // Fall back to the existing access token; if it's actually expired the
      // push/pull calls below will surface a clear 401 error to the caller.
    }

    const syncStartedAt = new Date().toISOString();
    const since = config.lastSyncedAt || null;

    const localChangesRes = await invoke<ApiResponse<Record<string, any[]>>>('sync_get_local_changes', {
      since,
    });
    if (!localChangesRes.success || !localChangesRes.data) {
      throw new Error(localChangesRes.error?.message || '读取本地变更失败');
    }
    const localChanges = localChangesRes.data;

    const pushed: Record<string, number> = {};
    for (const table of SYNC_TABLES) {
      const rows = localChanges[table] || [];
      await pushTable(config.supabaseUrl, config.supabaseAnonKey, session.accessToken, session.userId, table, rows);
      pushed[table] = rows.length;
    }

    const pulled: Record<string, number> = {};
    const remoteChanges: Record<string, any[]> = {};
    for (const table of SYNC_TABLES) {
      const rows = await pullTable(config.supabaseUrl, config.supabaseAnonKey, session.accessToken, session.userId, table, since);
      remoteChanges[table] = rows;
      pulled[table] = rows.length;
    }

    const applyRes = await invoke<ApiResponse<Record<string, number>>>('sync_apply_remote_changes', {
      changes: remoteChanges,
    });
    if (!applyRes.success) {
      throw new Error(applyRes.error?.message || '应用远程变更失败');
    }

    await invoke<ApiResponse<boolean>>('sync_set_watermark', { params: { timestamp: syncStartedAt } });

    return { pushed, pulled };
  },
};
