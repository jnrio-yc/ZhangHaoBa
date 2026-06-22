import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse } from '@/types/api';
import { isTauri } from './mockData';

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export const securityService = {
  async revealSecret(payload: { recordId: string; fieldKey: string; entryId?: string }) {
    if (!isTauri()) {
      const mockValues: Record<string, string> = {
        apiKey: 'sk-proj-aBcDeFgH1234567890xYzAbCdEfGh',
        password: 'P@ssw0rd!2026#Secure',
        licenseKey: 'A1B2-C3D4-E5F6-G7H8-I9J0',
      };
      return ok({ value: mockValues[payload.fieldKey] || 'mock-secret-value', expiresInSeconds: 30 });
    }
    return invoke<ApiResponse<{ value: string; expiresInSeconds: number }>>('security_reveal_secret', { payload });
  },
  async setMasterPassword(password: string, confirmPassword: string) {
    if (!isTauri()) return ok(undefined as any);
    return invoke<ApiResponse<void>>('security_set_master_password', { payload: { password, confirmPassword } });
  },
  async verifyMasterPassword(password: string) {
    if (!isTauri()) return ok({ verified: true, authToken: 'mock-token' });
    return invoke<ApiResponse<{ verified: boolean; authToken?: string }>>('security_verify_master_password', { password });
  },
  async setStrictMode(enabled: boolean, authToken?: string) {
    if (!isTauri()) return ok(undefined as any);
    return invoke<ApiResponse<void>>('security_set_strict_mode', { payload: { enabled, authToken } });
  },
  async lock() {
    if (!isTauri()) return ok(undefined as any);
    return invoke<ApiResponse<void>>('security_lock');
  },
  async unlock(password: string) {
    if (!isTauri()) return ok(undefined as any);
    return invoke<ApiResponse<void>>('security_unlock', { password });
  },
};
