import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface HardwareInfo {
  total_ram_gb: number;
  cpu_cores: number;
  gpu_type:
    | { Metal: null }
    | { Nvidia: { vram_gb: number } }
    | { Cpu: null }
    | string;
  tier: 'Minimum' | 'Recommended' | 'Optimal';
  recommended_quantization: string;
}

interface ModelInfo {
  name: string;
  size: string;
  url: string;
  filename: string;
}

interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

type SidecarStatus = 'stopped' | 'starting' | 'running' | 'error';

interface AiState {
  sidecarStatus: SidecarStatus;
  sidecarPort: number;
  hardwareInfo: HardwareInfo | null;
  error: string | null;
  availableModels: ModelInfo[];
  downloadProgress: DownloadProgress | null;
  isDownloading: boolean;
  detectHardware: () => Promise<void>;
  startSidecar: (modelPath: string) => Promise<void>;
  stopSidecar: () => Promise<void>;
  listAvailableModels: () => Promise<void>;
  downloadModel: (modelUrl: string, filename: string) => Promise<void>;
  checkModelExists: (filename: string) => Promise<boolean>;
  getModelPath: (filename: string) => Promise<string>;
}

export const useAiStore = create<AiState>((set, get) => ({
  sidecarStatus: 'stopped',
  sidecarPort: 8080,
  hardwareInfo: null,
  error: null,
  availableModels: [],
  downloadProgress: null,
  isDownloading: false,

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

  listAvailableModels: async () => {
    try {
      const models = await invoke<ModelInfo[]>('list_available_models');
      set({ availableModels: models });
    } catch (error) {
      console.error('Failed to list models:', error);
    }
  },

  downloadModel: async (modelUrl: string, filename: string) => {
    set({ isDownloading: true, downloadProgress: null, error: null });

    let unlistenProgress: (() => void) | null = null;
    let unlistenComplete: (() => void) | null = null;
    let completeFired = false;

    try {
      unlistenProgress = await listen<DownloadProgress>('download-progress', (event) => {
        set({ downloadProgress: event.payload });
      });

      unlistenComplete = await listen<string>('download-complete', async (event) => {
        completeFired = true;
        set({ isDownloading: false, downloadProgress: null });
        unlistenProgress?.();
        unlistenComplete?.();

        const modelPath = await get().getModelPath(event.payload);
        await get().startSidecar(modelPath);
      });

      await invoke('download_model', { modelUrl, filename });

      // If invoke resolved without download-complete event (model already existed),
      // clean up listeners and auto-start sidecar directly
      if (!completeFired) {
        unlistenProgress?.();
        unlistenComplete?.();
        set({ isDownloading: false, downloadProgress: null });

        const modelPath = await get().getModelPath(filename);
        await get().startSidecar(modelPath);
      }
    } catch (error) {
      unlistenProgress?.();
      unlistenComplete?.();
      const msg = error instanceof Error ? error.message : String(error);
      set({ isDownloading: false, downloadProgress: null, error: msg });
    }
  },

  checkModelExists: async (filename: string) => {
    try {
      return await invoke<boolean>('check_model_exists', { filename });
    } catch (error) {
      console.error('Failed to check model existence:', error);
      return false;
    }
  },

  getModelPath: async (filename: string) => {
    try {
      return await invoke<string>('get_model_path', { filename });
    } catch (error) {
      console.error('Failed to get model path:', error);
      throw error;
    }
  },
}));
