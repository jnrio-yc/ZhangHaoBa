import { isTauri } from './mockData';

/**
 * Make an HTTP GET request that bypasses CORS.
 * In Tauri mode, uses the Tauri HTTP module (Rust-side fetch).
 * In browser mode, uses the standard fetch API.
 */
async function httpGet(url: string, headers: Record<string, string>): Promise<{ status: number; data: any }> {
  if (isTauri()) {
    try {
      const { fetch: tauriFetch, ResponseType } = await import('@tauri-apps/api/http');
      const resp = await tauriFetch(url, {
        method: 'GET',
        headers,
        timeout: 15,
        responseType: ResponseType.JSON,
      });
      return { status: resp.status, data: resp.data };
    } catch (e: any) {
      throw new Error(e?.message || '网络请求失败');
    }
  } else {
    const resp = await fetch(url, { headers });
    const data = await resp.json().catch(() => null);
    return { status: resp.status, data };
  }
}

/** Normalize base URL: remove trailing slash */
function normalizeUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Fetch model list from an OpenAI-compatible API endpoint.
 * Tries: {baseUrl}/models
 * Returns sorted array of model ID strings.
 */
export async function fetchModelList(baseUrl: string, apiKey: string): Promise<string[]> {
  if (!baseUrl || !apiKey) throw new Error('请先填写 Base URL 和 API Key');

  const base = normalizeUrl(baseUrl);
  const headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}` };

  // Try the standard /models endpoint
  const urls = [
    `${base}/models`,
    // Some providers use /v1/models even if base already includes /v1
  ];

  let lastError = '';
  for (const url of urls) {
    try {
      const { status, data } = await httpGet(url, headers);
      if (status === 401 || status === 403) throw new Error('API Key 无效或已过期');
      if (status >= 400) throw new Error(`请求失败 (HTTP ${status})`);

      // OpenAI format: { data: [{ id: "model-name", ... }] }
      if (data?.data && Array.isArray(data.data)) {
        return data.data
          .map((m: any) => m.id || m.name || '')
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b));
      }
      // Some APIs return an array directly
      if (Array.isArray(data)) {
        return data
          .map((m: any) => m.id || m.name || m)
          .filter((v: any) => typeof v === 'string' && v)
          .sort();
      }
      lastError = '无法解析模型列表响应';
    } catch (e: any) {
      lastError = e.message || '请求失败';
      if (e.message?.includes('API Key')) throw e;
    }
  }

  throw new Error(lastError || '获取模型列表失败');
}

/**
 * Try to fetch wallet/balance info from the API provider.
 * Tries several common balance endpoints.
 * Returns a human-readable balance string.
 */
export async function fetchBalance(baseUrl: string, apiKey: string): Promise<string> {
  if (!baseUrl || !apiKey) throw new Error('请先填写 Base URL 和 API Key');

  const base = normalizeUrl(baseUrl);
  const headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}` };

  // Common balance endpoints to try (in order)
  const endpoints = [
    '/dashboard/billing/credit_grants',
    '/dashboard/billing/subscription',
    '/v1/dashboard/billing/credit_grants',
    '/v1/dashboard/billing/subscription',
    '/user/balance',
    '/api/user/balance',
  ];

  // Strip /v1 suffix for dashboard-style endpoints
  const baseWithoutV1 = base.replace(/\/v1\/?$/, '');

  const urlsToTry = [
    ...endpoints.map((ep) => `${baseWithoutV1}${ep}`),
    ...endpoints.map((ep) => `${base}${ep}`),
  ];
  // Deduplicate
  const uniqueUrls = [...new Set(urlsToTry)];

  for (const url of uniqueUrls) {
    try {
      const { status, data } = await httpGet(url, headers);
      if (status >= 400) continue;
      if (!data) continue;

      // Try to extract balance from common response shapes
      const balance = extractBalance(data);
      if (balance !== null) return balance;
    } catch {
      // Continue trying next endpoint
    }
  }

  throw new Error('无法获取钱包信息，该平台可能不支持此功能');
}

/** Try to extract a human-readable balance from various response formats */
function extractBalance(data: any): string | null {
  if (typeof data !== 'object' || !data) return null;

  // OpenAI style: { total_granted, total_used, total_available }
  if ('total_available' in data) {
    const avail = Number(data.total_available);
    const used = data.total_used !== undefined ? Number(data.total_used) : null;
    let result = `余额: $${avail.toFixed(2)}`;
    if (used !== null) result += ` (已用: $${used.toFixed(2)})`;
    return result;
  }

  // { balance: number } or { balance: "xxx" }
  if ('balance' in data) {
    const b = data.balance;
    if (typeof b === 'number') return `余额: $${b.toFixed(4)}`;
    if (typeof b === 'string') return `余额: ${b}`;
  }

  // { data: { balance: ... } }
  if (data.data && typeof data.data === 'object') {
    const inner = extractBalance(data.data);
    if (inner) return inner;
  }

  // Subscription style: { hard_limit_usd, system_hard_limit_usd }
  if ('hard_limit_usd' in data) {
    return `额度上限: $${Number(data.hard_limit_usd).toFixed(2)}`;
  }

  // { credits, used_credits }
  if ('credits' in data) {
    const credits = Number(data.credits);
    const used = data.used_credits !== undefined ? Number(data.used_credits) : null;
    let result = `余额: ${credits.toFixed(4)}`;
    if (used !== null) result += ` (已用: ${used.toFixed(4)})`;
    return result;
  }

  // { total_balance } or { available_balance }
  for (const key of ['total_balance', 'available_balance', 'remaining', 'quota', 'credit']) {
    if (key in data) {
      const val = data[key];
      if (typeof val === 'number') return `余额: $${val.toFixed(4)}`;
      if (typeof val === 'string') return `余额: ${val}`;
    }
  }

  return null;
}
