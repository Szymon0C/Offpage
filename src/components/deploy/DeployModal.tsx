import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDeployStore } from '../../stores/deployStore';
import { useProjectStore } from '../../stores/projectStore';
import { PROVIDERS, getProvider } from '../../lib/deployProviders';
import { getDatabase } from '../../db/database';
import type { DeployProvider } from '../../lib/deployProviders';

interface DeployResult {
  provider: string;
  site_id: string;
  url: string;
}

export function DeployModal() {
  const { status, error, deployUrl, modalOpen, closeModal, setStatus, setDeployUrl, loadToken, saveToken, reset } =
    useDeployStore();
  const currentProject = useProjectStore((s) => s.currentProject);
  const [selectedProvider, setSelectedProvider] = useState<DeployProvider | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [needsToken, setNeedsToken] = useState(false);

  useEffect(() => {
    if (modalOpen) {
      reset();
      setSelectedProvider(null);
      setTokenInput('');
      setNeedsToken(false);
    }
  }, [modalOpen, reset]);

  if (!modalOpen || !currentProject) return null;

  const handleSelectProvider = async (provider: DeployProvider) => {
    setSelectedProvider(provider);
    const existingToken = await loadToken(provider);
    if (existingToken) {
      startDeploy(provider, existingToken);
    } else {
      setNeedsToken(true);
    }
  };

  const handleSubmitToken = () => {
    const token = tokenInput.trim();
    if (!token || !selectedProvider) return;
    saveToken(selectedProvider, token);
    startDeploy(selectedProvider, token);
  };

  const startDeploy = async (provider: DeployProvider, token: string) => {
    setStatus('deploying');
    setNeedsToken(false);

    try {
      const existingConfig: { provider: string; site_id: string; url: string } | null =
        currentProject.deploy_config
          ? (typeof currentProject.deploy_config === 'string'
            ? JSON.parse(currentProject.deploy_config as string)
            : currentProject.deploy_config)
          : null;
      const existingSiteId =
        existingConfig?.provider === provider ? existingConfig.site_id : undefined;

      let result: DeployResult;

      switch (provider) {
        case 'netlify':
          result = await invoke<DeployResult>('deploy_netlify', {
            token,
            html: currentProject.html,
            siteId: existingSiteId ?? null,
          });
          break;
        case 'vercel':
          result = await invoke<DeployResult>('deploy_vercel', {
            token,
            html: currentProject.html,
            projectName: currentProject.name,
          });
          break;
        case 'github-pages':
          result = await invoke<DeployResult>('deploy_github_pages', {
            token,
            html: currentProject.html,
            repoName: currentProject.name,
          });
          break;
      }

      // Save deploy config to project
      const db = await getDatabase();
      const deployConfig = JSON.stringify({
        provider: result.provider,
        site_id: result.site_id,
        url: result.url,
      });
      await db.execute(
        'UPDATE projects SET deploy_config = ? WHERE id = ?',
        [deployConfig, currentProject.id]
      );

      setDeployUrl(result.url);
      setStatus('success');
    } catch (err) {
      setStatus('error', String(err));
    }
  };

  const handleExport = async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const path = await save({
        defaultPath: `${currentProject.name.replace(/\s+/g, '-').toLowerCase()}.html`,
        filters: [{ name: 'HTML', extensions: ['html'] }],
      });
      if (path) {
        await invoke('export_html', { html: currentProject.html, path });
        setDeployUrl(path);
        setStatus('success');
      }
    } catch (err) {
      setStatus('error', String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={closeModal}>
      <div
        className="bg-[var(--color-bg-secondary)] rounded-2xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Deploy</h2>
          <button
            type="button"
            onClick={closeModal}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl px-2"
          >
            &times;
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {status === 'success' && deployUrl && (
            <div className="text-center py-6">
              <div className="text-3xl mb-3">&#10003;</div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                Deployed!
              </h3>
              <a
                href={deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] text-sm hover:underline break-all"
              >
                {deployUrl}
              </a>
              <div className="flex gap-2 justify-center mt-4">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(deployUrl)}
                  className="bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-xs px-3 py-2 rounded-lg"
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-[var(--color-accent)] text-white text-xs px-3 py-2 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {status === 'deploying' && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                Deploying to {selectedProvider ? getProvider(selectedProvider).name : ''}...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-sm px-4 py-2 rounded-lg w-full"
              >
                Try Again
              </button>
            </div>
          )}

          {needsToken && status === 'idle' && selectedProvider && (
            <div className="py-2">
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                {getProvider(selectedProvider).tokenHelp}
              </p>
              <a
                href={getProvider(selectedProvider).tokenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] text-xs hover:underline mb-3 block"
              >
                Get your token &rarr;
              </a>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitToken(); }}
                placeholder={getProvider(selectedProvider).placeholder}
                className="w-full bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)] mb-3"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSubmitToken}
                disabled={!tokenInput.trim()}
                className="bg-[var(--color-accent)] text-white text-sm px-4 py-2 rounded-lg w-full disabled:opacity-50"
              >
                Deploy to {getProvider(selectedProvider).name}
              </button>
            </div>
          )}

          {!needsToken && status === 'idle' && (
            <div className="flex flex-col gap-3">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleSelectProvider(provider.id)}
                  className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg p-4 text-left hover:border-[var(--color-accent)] transition-colors"
                >
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {provider.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {provider.description}
                  </p>
                </button>
              ))}

              <div className="border-t border-[var(--color-border)] pt-3 mt-1">
                <button
                  type="button"
                  onClick={handleExport}
                  className="text-[var(--color-text-secondary)] text-xs hover:text-[var(--color-text-primary)] transition-colors"
                >
                  Or export as HTML file...
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
