import { isTauri } from './mockData';
import { syncService } from './syncService';
import { useSyncStore } from '@/stores/syncStore';

/**
 * Shared entry point for all three sync triggers (manual button, app
 * startup, post-save). Guards against overlapping runs and keeps
 * syncStore's status fields in sync with the outcome.
 */
export async function triggerSync(): Promise<void> {
  if (!isTauri()) return;
  const store = useSyncStore.getState();
  if (!store.isSignedIn || store.isSyncing) return;

  store.setSyncing(true);
  store.setLastSyncError(null);
  try {
    await syncService.runSync();
    const configRes = await syncService.getConfig();
    store.setLastSyncedAt(configRes.data?.lastSyncedAt || null);
  } catch (e: any) {
    store.setLastSyncError(e?.message || '同步失败');
  } finally {
    store.setSyncing(false);
  }
}

/** Fire-and-forget variant for call sites that must not await sync. */
export function triggerSyncInBackground(): void {
  void triggerSync();
}

export async function initSyncStatus(): Promise<void> {
  if (!isTauri()) return;
  const store = useSyncStore.getState();
  try {
    const configRes = await syncService.getConfig();
    const config = configRes.data;
    store.setSignedIn(config?.isSignedIn ? config.userEmail || '' : null);
    store.setLastSyncedAt(config?.lastSyncedAt || null);
  } catch {
    // Non-fatal: sync status just stays at defaults if this fails.
  }
}
