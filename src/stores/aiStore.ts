import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface HardwareInfo {
  total_ram_gb: number;
  cpu_cores: number;
  gpu_type: { Metal: null } | { Nvidia: { vram_gb: number } } | { Cpu: null };
  tier: 'Minimum' | 'Recommended' | 'Optimal';
  recommended_quantization: string;
}

type SidecarStatus = 'stopped' | 'starting' | 'running' | 'error';

interface AiState {
  sidecarStatus: SidecarStatus;
  sidecarPort: number;
  hardwareInfo: HardwareInfo | null;
  error: string | null;
  detectHardware: () => Promise<void>;
  startSidecar: (modelPath: string) => Promise<void>;
  stopSidecar: () => Promise<void>;
}

export const useAiStore = create<AiState>((set) => ({
  sidecarStatus: 'stopped',
  sidecarPort: 8080,
  hardwareInfo: null,
  error: null,

  detectHardware: async () => {
    try {
      const info = await invoke<HardwareInfo>('get_hardware_info');
      set({ hardwareInfo: info });
    } catch (error) {
      console.error('Hardware detection failed:', error);
    }
  },

  startSidecar: async (modelPath: string) => {
    set({ sidecarStatus: 'starting', error: null });
    try {
      const port = await invoke<number>('start_sidecar', {
        modelPath,
        port: 8080,
      });
      set({ sidecarStatus: 'running', sidecarPort: port });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      set({ sidecarStatus: 'error', error: msg });
    }
  },

  stopSidecar: async () => {
    try {
      await invoke('stop_sidecar');
      set({ sidecarStatus: 'stopped' });
    } catch (error) {
      console.error('Failed to stop sidecar:', error);
    }
  },
}));
