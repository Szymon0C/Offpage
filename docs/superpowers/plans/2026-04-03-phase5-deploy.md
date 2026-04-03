# Phase 5: Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable one-click deployment of generated HTML to Netlify, Vercel, or GitHub Pages, plus local file export as fallback. Users authenticate once via API token, then deploy/redeploy from the top bar.

**Architecture:** Rust backend exposes deploy commands per provider (Netlify deploy API, Vercel deployments API, GitHub Pages via repo API). Tokens are stored in the SQLite settings table. The frontend has a deploy modal for provider selection, token input, and deploy progress. Subsequent deploys update the same site (project stores deploy_config with provider + site_id + url).

**Tech Stack:** Rust (reqwest for HTTP), React 19, TypeScript, Zustand, Tauri IPC, SQLite

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src-tauri/src/deploy.rs` | Rust deploy commands: deploy_netlify, deploy_vercel, deploy_github_pages, export_html |
| `src/stores/deployStore.ts` | Deploy state: provider tokens, deploy status, current deploy URL |
| `src/components/deploy/DeployModal.tsx` | Modal: provider selection, token input, deploy progress, success URL |
| `src/lib/deployProviders.ts` | Provider metadata (names, token URLs, help text) |

### Modified Files
| File | Changes |
|------|---------|
| `src-tauri/src/lib.rs` | Register deploy module and commands |
| `src-tauri/Cargo.toml` | Add base64 dependency for file upload encoding |
| `src/components/layout/TopBar.tsx` | Wire Deploy button to open modal, add viewport toggle |
| `src/stores/projectStore.ts` | Add updateDeployConfig action |

---

### Task 1: Rust Deploy Module

**Files:**
- Create: `src-tauri/src/deploy.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add base64 dependency**

In `src-tauri/Cargo.toml`, add to `[dependencies]`:
```toml
base64 = "0.22"
```

- [ ] **Step 2: Create the deploy module**

```rust
// src-tauri/src/deploy.rs
use base64::Engine;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeployResult {
    pub provider: String,
    pub site_id: String,
    pub url: String,
}

// --- Netlify ---
// POST https://api.netlify.com/api/v1/sites/{site_id}/deploys
// or POST https://api.netlify.com/api/v1/sites (first deploy)
// Body: zip file with index.html
// Auth: Bearer token

#[tauri::command]
pub async fn deploy_netlify(
    token: String,
    html: String,
    site_id: Option<String>,
) -> Result<DeployResult, String> {
    let client = reqwest::Client::new();

    // Create a simple zip with just index.html
    let zip_bytes = create_zip_with_html(&html)
        .map_err(|e| format!("Failed to create zip: {}", e))?;

    let url = match &site_id {
        Some(id) => format!("https://api.netlify.com/api/v1/sites/{}/deploys", id),
        None => "https://api.netlify.com/api/v1/sites".to_string(),
    };

    // For first deploy, create site first
    let final_site_id = if site_id.is_none() {
        let create_resp = client
            .post("https://api.netlify.com/api/v1/sites")
            .bearer_auth(&token)
            .json(&serde_json::json!({}))
            .send()
            .await
            .map_err(|e| format!("Failed to create Netlify site: {}", e))?;

        if !create_resp.status().is_success() {
            let status = create_resp.status();
            let body = create_resp.text().await.unwrap_or_default();
            return Err(format!("Netlify site creation failed ({}): {}", status, body));
        }

        let site_data: serde_json::Value = create_resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse Netlify response: {}", e))?;

        site_data["id"]
            .as_str()
            .ok_or("Missing site id in Netlify response")?
            .to_string()
    } else {
        site_id.unwrap()
    };

    // Deploy the zip
    let deploy_url = format!(
        "https://api.netlify.com/api/v1/sites/{}/deploys",
        final_site_id
    );

    let resp = client
        .post(&deploy_url)
        .bearer_auth(&token)
        .header("Content-Type", "application/zip")
        .body(zip_bytes)
        .send()
        .await
        .map_err(|e| format!("Netlify deploy failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Netlify deploy failed ({}): {}", status, body));
    }

    let deploy_data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse deploy response: {}", e))?;

    let site_url = deploy_data["ssl_url"]
        .as_str()
        .or_else(|| deploy_data["url"].as_str())
        .unwrap_or("")
        .to_string();

    Ok(DeployResult {
        provider: "netlify".to_string(),
        site_id: final_site_id,
        url: site_url,
    })
}

// --- Vercel ---

#[tauri::command]
pub async fn deploy_vercel(
    token: String,
    html: String,
    project_name: String,
) -> Result<DeployResult, String> {
    let client = reqwest::Client::new();

    let encoded = base64::engine::general_purpose::STANDARD.encode(html.as_bytes());

    let body = serde_json::json!({
        "name": project_name.to_lowercase().replace(' ', "-"),
        "files": [
            {
                "file": "index.html",
                "data": encoded,
                "encoding": "base64"
            }
        ],
        "projectSettings": {
            "framework": null
        }
    });

    let resp = client
        .post("https://api.vercel.com/v13/deployments")
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Vercel deploy failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Vercel deploy failed ({}): {}", status, body));
    }

    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Vercel response: {}", e))?;

    let deploy_url = data["url"]
        .as_str()
        .map(|u| {
            if u.starts_with("http") {
                u.to_string()
            } else {
                format!("https://{}", u)
            }
        })
        .unwrap_or_default();

    let project_id = data["projectId"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(DeployResult {
        provider: "vercel".to_string(),
        site_id: project_id,
        url: deploy_url,
    })
}

// --- GitHub Pages ---

#[tauri::command]
pub async fn deploy_github_pages(
    token: String,
    html: String,
    repo_name: String,
) -> Result<DeployResult, String> {
    let client = reqwest::Client::new();

    // Get authenticated user
    let user_resp = client
        .get("https://api.github.com/user")
        .bearer_auth(&token)
        .header("User-Agent", "Offpage-App")
        .send()
        .await
        .map_err(|e| format!("GitHub auth failed: {}", e))?;

    if !user_resp.status().is_success() {
        return Err("Invalid GitHub token".to_string());
    }

    let user: serde_json::Value = user_resp.json().await.map_err(|e| e.to_string())?;
    let username = user["login"]
        .as_str()
        .ok_or("Failed to get GitHub username")?
        .to_string();

    let repo_slug = repo_name.to_lowercase().replace(' ', "-");

    // Try to create repo (ignore if exists)
    let _create = client
        .post("https://api.github.com/user/repos")
        .bearer_auth(&token)
        .header("User-Agent", "Offpage-App")
        .json(&serde_json::json!({
            "name": &repo_slug,
            "auto_init": true,
            "private": false
        }))
        .send()
        .await;

    // Upload index.html (create or update)
    let encoded = base64::engine::general_purpose::STANDARD.encode(html.as_bytes());
    let file_url = format!(
        "https://api.github.com/repos/{}/{}/contents/index.html",
        username, repo_slug
    );

    // Check if file exists (to get SHA for update)
    let existing = client
        .get(&file_url)
        .bearer_auth(&token)
        .header("User-Agent", "Offpage-App")
        .send()
        .await;

    let mut file_body = serde_json::json!({
        "message": "Deploy from Offpage",
        "content": encoded,
        "branch": "main"
    });

    if let Ok(resp) = existing {
        if resp.status().is_success() {
            let data: serde_json::Value = resp.json().await.unwrap_or_default();
            if let Some(sha) = data["sha"].as_str() {
                file_body["sha"] = serde_json::json!(sha);
            }
        }
    }

    let upload_resp = client
        .put(&file_url)
        .bearer_auth(&token)
        .header("User-Agent", "Offpage-App")
        .json(&file_body)
        .send()
        .await
        .map_err(|e| format!("GitHub file upload failed: {}", e))?;

    if !upload_resp.status().is_success() {
        let status = upload_resp.status();
        let body = upload_resp.text().await.unwrap_or_default();
        return Err(format!("GitHub upload failed ({}): {}", status, body));
    }

    // Enable GitHub Pages
    let pages_url = format!(
        "https://api.github.com/repos/{}/{}/pages",
        username, repo_slug
    );

    let _ = client
        .post(&pages_url)
        .bearer_auth(&token)
        .header("User-Agent", "Offpage-App")
        .json(&serde_json::json!({
            "source": { "branch": "main", "path": "/" }
        }))
        .send()
        .await;

    let site_url = format!("https://{}.github.io/{}", username, repo_slug);

    Ok(DeployResult {
        provider: "github-pages".to_string(),
        site_id: format!("{}/{}", username, repo_slug),
        url: site_url,
    })
}

// --- Local Export ---

#[tauri::command]
pub async fn export_html(html: String, path: String) -> Result<String, String> {
    tokio::fs::write(&path, &html)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(path)
}

// --- Helpers ---

fn create_zip_with_html(html: &str) -> Result<Vec<u8>, std::io::Error> {
    use std::io::Write;

    let buf = Vec::new();
    let cursor = std::io::Cursor::new(buf);
    let mut zip = zip::ZipWriter::new(cursor);

    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    zip.start_file("index.html", options)?;
    zip.write_all(html.as_bytes())?;

    let cursor = zip.finish()?;
    Ok(cursor.into_inner())
}
```

- [ ] **Step 3: Register deploy module in lib.rs**

In `src-tauri/src/lib.rs`, add:
```rust
mod deploy;
```

And add to the `invoke_handler`:
```rust
deploy::deploy_netlify,
deploy::deploy_vercel,
deploy::deploy_github_pages,
deploy::export_html,
```

- [ ] **Step 4: Add zip dependency to Cargo.toml**

```toml
zip = { version = "2", default-features = false, features = ["deflate"] }
```

- [ ] **Step 5: Verify Rust compiles (if cargo available) or verify file structure**

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/deploy.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "feat: add Rust deploy commands for Netlify, Vercel, GitHub Pages"
```

---

### Task 2: Deploy Provider Metadata

**Files:**
- Create: `src/lib/deployProviders.ts`

- [ ] **Step 1: Create provider metadata**

```typescript
// src/lib/deployProviders.ts

export type DeployProvider = 'netlify' | 'vercel' | 'github-pages';

export interface ProviderInfo {
  id: DeployProvider;
  name: string;
  description: string;
  tokenUrl: string;
  tokenHelp: string;
  placeholder: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'netlify',
    name: 'Netlify',
    description: 'Deploy to Netlify with a single click',
    tokenUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
    tokenHelp: 'Create a Personal Access Token in Netlify settings',
    placeholder: 'nfp_xxxxxxxxxxxx',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy to Vercel instantly',
    tokenUrl: 'https://vercel.com/account/tokens',
    tokenHelp: 'Create a token in Vercel account settings',
    placeholder: 'vc_xxxxxxxxxxxx',
  },
  {
    id: 'github-pages',
    name: 'GitHub Pages',
    description: 'Host on GitHub Pages for free',
    tokenUrl: 'https://github.com/settings/tokens/new?scopes=repo',
    tokenHelp: 'Create a token with "repo" scope',
    placeholder: 'ghp_xxxxxxxxxxxx',
  },
];

export function getProvider(id: DeployProvider): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id)!;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/deployProviders.ts
git commit -m "feat: add deploy provider metadata"
```

---

### Task 3: Deploy Store

**Files:**
- Create: `src/stores/deployStore.ts`

- [ ] **Step 1: Create deploy store**

```typescript
// src/stores/deployStore.ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/stores/deployStore.ts
git commit -m "feat: add deploy store with token management"
```

---

### Task 4: Deploy Modal Component

**Files:**
- Create: `src/components/deploy/DeployModal.tsx`

Three-step modal: 1) Provider selection, 2) Token input (if needed), 3) Deploy progress / success.

- [ ] **Step 1: Create DeployModal**

```tsx
// src/components/deploy/DeployModal.tsx
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDeployStore } from '../../stores/deployStore';
import { useProjectStore } from '../../stores/projectStore';
import { PROVIDERS, getProvider } from '../../lib/deployProviders';
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
  const updateProjectHtml = useProjectStore((s) => s.updateProjectHtml);
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
      const existingConfig = currentProject.deploy_config;
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

      // Update project with deploy config
      const db = await (await import('../../db/database')).getDatabase();
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
        {/* Header */}
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

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Success State */}
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

          {/* Deploying State */}
          {status === 'deploying' && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                Deploying to {selectedProvider ? getProvider(selectedProvider).name : ''}...
              </p>
            </div>
          )}

          {/* Error State */}
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

          {/* Token Input */}
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

          {/* Provider Selection */}
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
```

Note: The dialog plugin import (`@tauri-apps/plugin-dialog`) is used for save dialog in local export. If not available, this can be skipped — the export_html command takes a path directly.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
May need to install `@tauri-apps/plugin-dialog` or use a different approach for file save dialog.

- [ ] **Step 3: Commit**

```bash
git add src/components/deploy/DeployModal.tsx
git commit -m "feat: add DeployModal with provider selection and progress"
```

---

### Task 5: Wire TopBar Deploy Button + Viewport Toggle

**Files:**
- Modify: `src/components/layout/TopBar.tsx`

Replace the current disabled buttons with a functional Deploy button that opens the modal, plus the viewport toggle from editorStore.

- [ ] **Step 1: Update TopBar**

```tsx
// src/components/layout/TopBar.tsx
import { useProjectStore } from '../../stores/projectStore';
import { useEditorStore } from '../../stores/editorStore';
import { useDeployStore } from '../../stores/deployStore';
import type { ViewportSize } from '../../stores/editorStore';

const VIEWPORT_OPTIONS: Array<{ value: ViewportSize; label: string }> = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
];

export function TopBar() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const { viewport, setViewport } = useEditorStore();
  const openModal = useDeployStore((s) => s.openModal);
  const hasHtml = !!currentProject?.html;

  return (
    <header className="h-10 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <span className="font-bold text-sm text-white">◈ Offpage</span>
        {currentProject && (
          <>
            <span className="text-[var(--color-text-secondary)] opacity-50">|</span>
            <span className="text-[var(--color-text-secondary)] text-sm">
              {currentProject.name}
            </span>
          </>
        )}
      </div>
      <div className="flex gap-2">
        {currentProject && (
          <>
            <div className="flex gap-0.5">
              {VIEWPORT_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setViewport(v.value)}
                  disabled={!hasHtml}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    viewport === v.value
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  } ${!hasHtml ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={openModal}
              disabled={!hasHtml}
              className={`bg-[var(--color-accent)] px-3 py-1 rounded-md text-xs text-white transition-opacity ${
                !hasHtml ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              Deploy
            </button>
          </>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopBar.tsx
git commit -m "feat: wire Deploy button and viewport toggle in TopBar"
```

---

### Task 6: Add DeployModal to AppShell

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

Add the DeployModal as a global component rendered in AppShell.

- [ ] **Step 1: Update AppShell**

Read `src/components/layout/AppShell.tsx` first. Add:

```tsx
import { DeployModal } from '../deploy/DeployModal';
```

And render `<DeployModal />` alongside the existing layout (after the closing main content div, before the final closing tag).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: render DeployModal globally in AppShell"
```

---

### Task 7: Install Dialog Plugin (for local export)

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Install the dialog plugin**

```bash
npm install @tauri-apps/plugin-dialog
```

Add to `src-tauri/Cargo.toml`:
```toml
tauri-plugin-dialog = "2"
```

Add to `src-tauri/src/lib.rs` in the Builder chain:
```rust
.plugin(tauri_plugin_dialog::init())
```

Add to `src-tauri/capabilities/default.json` permissions:
```json
"dialog:default"
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat: add tauri dialog plugin for file save dialog"
```

---

### Task 8: Final Verification

- [ ] **Step 1: TypeScript compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 2: Vite build**

Run: `npm run build`

- [ ] **Step 3: Commit any fixes**
