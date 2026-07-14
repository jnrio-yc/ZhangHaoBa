export interface SyncConfigView {
  supabaseUrl?: string | null;
  supabaseAnonKey?: string | null;
  lastSyncedAt?: string | null;
  userEmail?: string | null;
  isSignedIn: boolean;
}

export interface SyncSession {
  accessToken: string;
  refreshToken: string;
  email: string;
  userId: string;
}
