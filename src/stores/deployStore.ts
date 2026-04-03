import { create } from 'zustand';
import { getDatabase } from '../db/database';
import type { DeployProvider } from '../lib/deployProviders';

export type DeployStatus = 'idle' | 'deploying' | 'success' | 'error';

interface DeployState {
  status: DeployStatus;
  error: string | null;
  deployUrl: string | null;
  tokens: Partial<Record<DeployProvider, string>>;
  modalOpen: boolean;

  openModal: () => void;
  closeModal: () => void;
  setStatus: (status: DeployStatus, error?: string) => void;
  setDeployUrl: (url: string) => void;
  loadToken: (provider: DeployProvider) => Promise<string | null>;
  saveToken: (provider: DeployProvider, token: string) => Promise<void>;
  reset: () => void;
}

export const useDeployStore = create<DeployState>((set, get) => ({
  status: 'idle',
  error: null,
  deployUrl: null,
  tokens: {},
  modalOpen: false,

  openModal: () => set({ modalOpen: true, status: 'idle', error: null, deployUrl: null }),
  closeModal: () => set({ modalOpen: false }),

  setStatus: (status, error) => set({ status, error: error ?? null }),
  setDeployUrl: (url) => set({ deployUrl: url }),

  loadToken: async (provider) => {
    const cached = get().tokens[provider];
    if (cached) return cached;

    const db = await getDatabase();
    const rows = await db.select<Array<{ value: string }>>(
      "SELECT value FROM settings WHERE key = ?",
      [`deploy_token_${provider}`]
    );
    const token = rows[0]?.value ? JSON.parse(rows[0].value) : null;
    if (token) {
      set((state) => ({ tokens: { ...state.tokens, [provider]: token } }));
    }
    return token;
  },

  saveToken: async (provider, token) => {
    const db = await getDatabase();
    await db.execute(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [`deploy_token_${provider}`, JSON.stringify(token)]
    );
    set((state) => ({ tokens: { ...state.tokens, [provider]: token } }));
  },

  reset: () => set({ status: 'idle', error: null, deployUrl: null }),
}));
