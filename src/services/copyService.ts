import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse, CopyFieldRequest, CopyFieldResponse } from '@/types/api';
import { isTauri } from './mockData';

async function browserCopy(text: string): Promise<ApiResponse<CopyFieldResponse>> {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true, data: { copied: true } as any };
  } catch {
    return { success: false, error: { code: 'COPY_FAILED', message: '浏览器复制失败' } };
  }
}

export const copyService = {
  async copyField(payload: CopyFieldRequest): Promise<ApiResponse<CopyFieldResponse>> {
    if (!isTauri()) {
      // Browser mock: copy a placeholder value based on fieldKey
      const placeholders: Record<string, string> = {
        apiKey: 'sk-mock-api-key-xxxxxxxxxxxx',
        password: '••••••••',
        licenseKey: 'XXXX-XXXX-XXXX-XXXX',
        baseUrl: 'https://api.example.com/v1',
        url: 'https://example.com',
        username: 'user@example.com',
        env: `API_KEY=sk-mock-api-key-xxxxxxxxxxxx\nBASE_URL=https://api.example.com/v1`,
        json: JSON.stringify({ apiKey: 'sk-mock-xxx', baseUrl: 'https://api.example.com/v1' }, null, 2),
      };
      const text = placeholders[payload.fieldKey] || `[${payload.fieldKey}]`;
      return browserCopy(text);
    }
    return invoke<ApiResponse<CopyFieldResponse>>('copy_field', { payload });
  },

  async copyTemplate(payload: { recordId: string; templateKey: string; entryId?: string }): Promise<ApiResponse<CopyFieldResponse>> {
    if (!isTauri()) {
      return browserCopy(`[${payload.templateKey} template]`);
    }
    return invoke<ApiResponse<CopyFieldResponse>>('copy_template', { payload });
  },
};
