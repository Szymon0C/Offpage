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
      console.log('[AI] Detecting hardware...');
      const info = await invoke<HardwareInfo>('get_hardware_info');
      console.log('[AI] Hardware detected:', info);
      set({ hardwareInfo: info });
    } catch (error) {
      console.error('[AI] Hardware detection failed:', error);
    }
  },

  startSidecar: async (modelPath: string) => {
    console.log('[AI] Starting sidecar with model:', modelPath);
    set({ sidecarStatus: 'starting', error: null });
    try {
      const port = await invoke<number>('start_sidecar', {
        modelPath,
        port: 8080,
      });
      console.log('[AI] Sidecar running on port:', port);
      set({ sidecarStatus: 'running', sidecarPort: port });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[AI] Sidecar failed to start:', msg);
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
      console.log('[AI] Listing available models...');
      const models = await invoke<ModelInfo[]>('list_available_models');
      console.log('[AI] Available models:', models);
      set({ availableModels: models });
    } catch (error) {
      console.error('[AI] Failed to list models:', error);
    }
  },

  downloadModel: async (modelUrl: string, filename: string) => {
    console.log('[AI] downloadModel called:', { modelUrl, filename });
    set({ isDownloading: true, downloadProgress: null, error: null });

    let unlistenProgress: (() => void) | null = null;
    let unlistenComplete: (() => void) | null = null;
    let completeFired = false;

    try {
      unlistenProgress = await listen<DownloadProgress>('download-progress', (event) => {
        console.log('[AI] Download progress:', event.payload.percentage.toFixed(1) + '%');
        set({ downloadProgress: event.payload });
      });

      unlistenComplete = await listen<string>('download-complete', async (event) => {
        console.log('[AI] Download complete event received:', event.payload);
        completeFired = true;
        set({ isDownloading: false, downloadProgress: null });
        unlistenProgress?.();
        unlistenComplete?.();

        const modelPath = await get().getModelPath(event.payload);
        console.log('[AI] Model path after download:', modelPath);
        await get().startSidecar(modelPath);
      });

      console.log('[AI] Invoking download_model command...');
      await invoke('download_model', { modelUrl, filename });
      console.log('[AI] download_model invoke resolved, completeFired:', completeFired);

      // If invoke resolved without download-complete event (model already existed),
      // clean up listeners and auto-start sidecar directly
      if (!completeFired) {
        console.log('[AI] No download-complete event — model likely already exists, starting sidecar directly');
        unlistenProgress?.();
        unlistenComplete?.();
        set({ isDownloading: false, downloadProgress: null });

        const modelPath = await get().getModelPath(filename);
        console.log('[AI] Model path (existing):', modelPath);
        await get().startSidecar(modelPath);
      }
    } catch (error) {
      unlistenProgress?.();
      unlistenComplete?.();
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[AI] Download/start failed:', msg);
      set({ isDownloading: false, downloadProgress: null, error: msg });
    }
  },

  checkModelExists: async (filename: string) => {
    try {
      const exists = await invoke<boolean>('check_model_exists', { filename });
      console.log(`[AI] checkModelExists(${filename}):`, exists);
      return exists;
    } catch (error) {
      console.error('[AI] Failed to check model existence:', error);
      return false;
    }
  },

  getModelPath: async (filename: string) => {
    try {
      const path = await invoke<string>('get_model_path', { filename });
      console.log(`[AI] getModelPath(${filename}):`, path);
      return path;
    } catch (error) {
      console.error('[AI] Failed to get model path:', error);
      throw error;
    }
  },
}));
