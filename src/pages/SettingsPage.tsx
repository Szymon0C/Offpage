import { useEffect, useState } from 'react';
import { useAiStore } from '../stores/aiStore';
import { useDeployStore } from '../stores/deployStore';
import { PROVIDERS } from '../lib/deployProviders';
import type { DeployProvider } from '../lib/deployProviders';

export function SettingsPage() {
  const { hardwareInfo, sidecarStatus, detectHardware, stopSidecar } = useAiStore();
  const { loadToken, saveToken } = useDeployStore();
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!hardwareInfo) detectHardware();
  }, [hardwareInfo, detectHardware]);

  useEffect(() => {
    PROVIDERS.forEach(async (p) => {
      const t = await loadToken(p.id);
      if (t) setTokens((prev) => ({ ...prev, [p.id]: t }));
    });
  }, [loadToken]);

  const handleSaveToken = async (provider: DeployProvider, value: string) => {
    await saveToken(provider, value);
    setSaved(provider);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Settings</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Configure AI model and deploy tokens.
          </p>
        </div>

        {/* AI Model */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            AI Model
          </h2>
          <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-primary)]">Status</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                sidecarStatus === 'running'
                  ? 'bg-green-500/20 text-green-400'
                  : sidecarStatus === 'starting'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
              }`}>
                {sidecarStatus}
              </span>
            </div>
            {hardwareInfo && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-primary)]">RAM</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {hardwareInfo.total_ram_gb.toFixed(1)} GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-primary)]">Tier</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {hardwareInfo.tier}
                  </span>
                </div>
              </>
            )}
            {sidecarStatus === 'running' && (
              <button
                type="button"
                onClick={stopSidecar}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Stop AI Model
              </button>
            )}
          </div>
        </section>

        {/* Deploy Tokens */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Deploy Tokens
          </h2>
          <div className="space-y-3">
            {PROVIDERS.map((provider) => (
              <div key={provider.id} className="bg-[var(--color-bg-tertiary)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {provider.name}
                  </span>
                  <a
                    href={provider.tokenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--color-accent)] hover:underline"
                  >
                    Get token
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={tokens[provider.id] || ''}
                    onChange={(e) => setTokens((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                    placeholder={provider.placeholder}
                    className="flex-1 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveToken(provider.id, tokens[provider.id] || '')}
                    className="bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-xs px-3 py-1.5 rounded-lg hover:bg-[var(--color-accent)] transition-colors"
                  >
                    {saved === provider.id ? 'Saved!' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            About
          </h2>
          <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-primary)]">Offpage</span>
              <span className="text-xs text-[var(--color-text-secondary)]">v0.1.0</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Generate websites with AI — entirely on your device.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
