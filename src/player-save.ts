import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LEGACY_SAVE_SCHEMA_VERSIONS, SAVE_KEY, SAVE_SCHEMA_VERSION, type GameState } from './game';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://edtsxeytaamidpaewdah.supabase.co';
// This is a publishable browser key. Never replace it with the secret key.
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_m9W5eOy88l19ROa5Vh3lAA_emvIElOE';
const SAVE_TABLE = 'player_saves';
const CLOUD_SAVE_DEBOUNCE_MS = 750;

interface RemoteSaveRow {
  save_data: unknown;
  updated_at: string;
}

function isGameState(value: unknown): value is GameState {
  return Boolean(value)
    && typeof value === 'object'
    && [SAVE_SCHEMA_VERSION, ...LEGACY_SAVE_SCHEMA_VERSIONS].includes(Number((value as Partial<GameState>).schemaVersion));
}

export class PlayerSaveSync {
  private readonly client: SupabaseClient;
  private userId: string | null = null;
  private initialization: Promise<void> | null = null;
  private pendingSerialized: string | null = null;
  private saveTimer: number | null = null;
  private saveInFlight = false;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  async initialize(localState: GameState, hasLocalSave: boolean): Promise<GameState | null> {
    this.initialization = this.initializeSession(localState, hasLocalSave);
    await this.initialization;
    return this.remoteState ?? null;
  }

  private remoteState: GameState | null = null;

  private async initializeSession(localState: GameState, hasLocalSave: boolean): Promise<void> {
    this.remoteState = null;
    const { data: sessionData, error: sessionError } = await this.client.auth.getSession();
    if (sessionError) {
      console.warn('Villagers - Idle World Game cloud session could not be restored; local saving remains active.', sessionError.message);
      return;
    }

    let userId = sessionData.session?.user.id ?? null;
    if (!userId) {
      const { data, error } = await this.client.auth.signInAnonymously();
      if (error || !data.user) {
        console.warn('Villagers - Idle World Game cloud saving is unavailable; enable Anonymous Sign-Ins in Supabase.', error?.message ?? 'No user returned');
        return;
      }
      userId = data.user.id;
    }
    this.userId = userId;

    const { data: remoteRow, error: loadError } = await this.client
      .from(SAVE_TABLE)
      .select('save_data, updated_at')
      .eq('user_id', userId)
      .eq('save_key', SAVE_KEY)
      .maybeSingle<RemoteSaveRow>();
    if (loadError) {
      console.warn('Villagers - Idle World Game cloud save could not be loaded; local saving remains active.', loadError.message);
      return;
    }

    if (remoteRow && isGameState(remoteRow.save_data)) {
      const remoteUpdatedAt = Date.parse(remoteRow.updated_at);
      const localUpdatedAt = Number(localState.lastSavedAt);
      if (!hasLocalSave || (Number.isFinite(remoteUpdatedAt) && remoteUpdatedAt > localUpdatedAt)) {
        this.remoteState = remoteRow.save_data;
        return;
      }
    }

    this.queue(localState);
  }

  queue(state: GameState): void {
    if (!this.userId) return;
    this.pendingSerialized = JSON.stringify(state);
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, CLOUD_SAVE_DEBOUNCE_MS);
  }

  async clearRemoteSave(): Promise<void> {
    if (this.initialization) await this.initialization;
    if (!this.userId) return;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.pendingSerialized = null;
    const { error } = await this.client
      .from(SAVE_TABLE)
      .delete()
      .eq('user_id', this.userId)
      .eq('save_key', SAVE_KEY);
    if (error) console.warn('Villagers - Idle World Game cloud save could not be cleared.', error.message);
  }

  private async flush(): Promise<void> {
    if (this.saveInFlight || !this.pendingSerialized || !this.userId) return;
    const serialized = this.pendingSerialized;
    this.pendingSerialized = null;
    this.saveInFlight = true;
    try {
      const { error } = await this.client.from(SAVE_TABLE).upsert({
        user_id: this.userId,
        save_key: SAVE_KEY,
        save_data: JSON.parse(serialized),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,save_key' });
      if (error) console.warn('Villagers - Idle World Game cloud save failed; local saving remains active.', error.message);
    } finally {
      this.saveInFlight = false;
      if (this.pendingSerialized) void this.flush();
    }
  }
}

export const playerSaveSync = new PlayerSaveSync();
