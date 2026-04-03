import { useEffect, useState } from 'react';
import { useAiStore } from '../../stores/aiStore';

export function ModelSetup() {
  const {
    hardwareInfo,
    availableModels,
    downloadProgress,
    isDownloading,
    listAvailableModels,
    downloadModel,
  } = useAiStore();

  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    listAvailableModels();
  }, [listAvailableModels]);

  const handleDownload = async () => {
    if (!selectedModel) return;

    const model = availableModels.find(m => m.filename === selectedModel);
    if (!model) return;

    await downloadModel(model.url, model.filename);
  };

  const getRecommendedModel = () => {
    if (!hardwareInfo) return null;

    // Recommend based on hardware tier
    if (hardwareInfo.tier === 'Optimal' || hardwareInfo.tier === 'Recommended') {
      return availableModels.find(m => m.name.includes('7B'));
    } else {
      return availableModels.find(m => m.name.includes('3B'));
    }
  };

  const recommendedModel = getRecommendedModel();

  if (isDownloading && downloadProgress) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-lg font-medium">Downloading AI Model...</div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          {downloadProgress.percentage.toFixed(1)}% complete
        </div>
        <div className="w-full max-w-md bg-[var(--color-bg-elevated)] rounded-full h-2">
          <div
            className="bg-[var(--color-accent)] h-2 rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress.percentage}%` }}
          />
        </div>
        <div className="text-xs text-[var(--color-text-secondary)]">
          {(downloadProgress.downloaded / 1024 / 1024 / 1024).toFixed(1)} GB / {(downloadProgress.total / 1024 / 1024 / 1024).toFixed(1)} GB
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Set up AI Model</h2>
        <p className="text-[var(--color-text-secondary)] max-w-md">
          Offpage needs an AI model to generate websites. Choose a model based on your hardware.
        </p>
      </div>

      {hardwareInfo && (
        <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg">
          <div className="text-sm font-medium mb-2">Your Hardware:</div>
          <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
            <div>RAM: {hardwareInfo.total_ram_gb.toFixed(1)} GB</div>
            <div>CPU Cores: {hardwareInfo.cpu_cores}</div>
            <div>
              GPU: {(() => {
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
                  return `NVIDIA (${hardwareInfo.gpu_type.Nvidia.vram_gb} GB VRAM)`;
                }
                if ('Cpu' in hardwareInfo.gpu_type) return 'CPU';
                return 'Unknown';
              })()}
            </div>
            <div className="font-medium text-[var(--color-accent)]">
              Tier: {hardwareInfo.tier}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 w-full max-w-md">
        {availableModels.map((model) => (
          <label
            key={model.filename}
            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
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
              className="text-[var(--color-accent)]"
            />
            <div className="flex-1">
              <div className="font-medium text-sm">{model.name}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">{model.size}</div>
            </div>
            {recommendedModel?.filename === model.filename && (
              <div className="text-xs bg-[var(--color-accent)] text-white px-2 py-1 rounded">
                Recommended
              </div>
            )}
          </label>
        ))}
      </div>

      <button
        onClick={handleDownload}
        disabled={!selectedModel || isDownloading}
        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        {isDownloading ? 'Downloading...' : 'Download & Start AI'}
      </button>

      <div className="text-xs text-[var(--color-text-secondary)] text-center max-w-md">
        Models are downloaded from Hugging Face and stored locally.
        This is a one-time setup that requires an internet connection.
      </div>
    </div>
  );
}