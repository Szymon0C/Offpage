import { useEffect, useState } from 'react';
import { useAiStore } from '../../stores/aiStore';

export function ModelSetup() {
  const {
    hardwareInfo,
    availableModels,
    downloadProgress,
    isDownloading,
    error,
    listAvailableModels,
    downloadModel,
  } = useAiStore();

  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    console.log('[ModelSetup] Mounting, listing available models...');
    listAvailableModels();
  }, [listAvailableModels]);

  useEffect(() => {
    console.log('[ModelSetup] State:', {
      hardwareInfo: !!hardwareInfo,
      availableModels: availableModels.length,
      isDownloading,
      downloadProgress,
      error,
      selectedModel,
    });
  }, [hardwareInfo, availableModels, isDownloading, downloadProgress, error, selectedModel]);

  const handleDownload = async () => {
    if (!selectedModel) return;

    const model = availableModels.find(m => m.filename === selectedModel);
    if (!model) return;

    console.log('[ModelSetup] Starting download:', model.filename, model.url);
    await downloadModel(model.url, model.filename);
    console.log('[ModelSetup] downloadModel() resolved');
  };

  const getRecommendedModel = () => {
    if (!hardwareInfo) return null;

    if (hardwareInfo.tier === 'Optimal' || hardwareInfo.tier === 'Recommended') {
      return availableModels.find(m => m.name.includes('7B'));
    } else {
      return availableModels.find(m => m.name.includes('3B'));
    }
  };

  const recommendedModel = getRecommendedModel();

  if (isDownloading) {
    return (
      <div className="flex flex-col items-center p-3 space-y-3">
        <div className="text-sm font-medium">Downloading AI Model...</div>
        {downloadProgress ? (
          <>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {downloadProgress.percentage.toFixed(1)}%
            </div>
            <div className="w-full bg-[var(--color-bg-elevated)] rounded-full h-1.5">
              <div
                className="bg-[var(--color-accent)] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.percentage}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--color-text-secondary)]">
              {(downloadProgress.downloaded / 1024 / 1024 / 1024).toFixed(1)} GB / {(downloadProgress.total / 1024 / 1024 / 1024).toFixed(1)} GB
            </div>
          </>
        ) : (
          <div className="text-xs text-[var(--color-text-secondary)]">
            Preparing download...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col p-3 space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Set up AI Model</h2>
        <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed">
          Choose a model based on your hardware.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {hardwareInfo && (
        <div className="bg-[var(--color-bg-elevated)] p-2.5 rounded-lg w-full">
          <div className="text-xs font-medium mb-1.5">Your Hardware</div>
          <div className="text-[11px] text-[var(--color-text-secondary)] space-y-0.5">
            <div className="flex justify-between">
              <span>RAM</span>
              <span>{hardwareInfo.total_ram_gb.toFixed(0)} GB</span>
            </div>
            <div className="flex justify-between">
              <span>CPU</span>
              <span>{hardwareInfo.cpu_cores} cores</span>
            </div>
            <div className="flex justify-between">
              <span>GPU</span>
              <span>{(() => {
                if (!hardwareInfo.gpu_type) return 'Unknown';
                if (typeof hardwareInfo.gpu_type === 'string') {
                  const gpu = hardwareInfo.gpu_type.toLowerCase();
                  if (gpu.includes('metal')) return 'Apple Silicon';
                  if (gpu.includes('nvidia')) return 'NVIDIA';
                  if (gpu.includes('cpu')) return 'CPU';
                  return hardwareInfo.gpu_type;
                }
                if ('Metal' in hardwareInfo.gpu_type) return 'Apple Silicon';
                if ('Nvidia' in hardwareInfo.gpu_type) {
                  return `NVIDIA ${hardwareInfo.gpu_type.Nvidia.vram_gb}GB`;
                }
                if ('Cpu' in hardwareInfo.gpu_type) return 'CPU';
                return 'Unknown';
              })()}</span>
            </div>
            <div className="flex justify-between font-medium text-[var(--color-accent)] pt-0.5">
              <span>Tier</span>
              <span>{hardwareInfo.tier}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 w-full">
        {availableModels.map((model) => (
          <label
            key={model.filename}
            className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
              selectedModel === model.filename
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            <input
              type="radio"
              name="model"
              value={model.filename}
              checked={selectedModel === model.filename}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-[var(--color-accent)] mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs">{model.name}</div>
              <div className="text-[11px] text-[var(--color-text-secondary)]">{model.size}</div>
            </div>
            {recommendedModel?.filename === model.filename && (
              <div className="text-[10px] bg-[var(--color-accent)] text-white px-1.5 py-0.5 rounded shrink-0">
                Best
              </div>
            )}
          </label>
        ))}
      </div>

      <button
        onClick={handleDownload}
        disabled={!selectedModel || isDownloading}
        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors w-full"
      >
        Download & Start AI
      </button>

      <div className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
        Models are downloaded from Hugging Face once and stored locally.
      </div>
    </div>
  );
}
