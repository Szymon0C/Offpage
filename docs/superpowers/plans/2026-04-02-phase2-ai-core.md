# Phase 2: AI Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add llama.cpp sidecar management, hardware detection, chat panel UI, and AI-powered website generation with streaming.

**Architecture:** Rust backend manages llama-server as a Tauri sidecar process. Hardware detector determines optimal model/quantization. Chat panel in React streams AI responses via Tauri events. AI generates complete HTML pages from user prompts.

**Tech Stack:** Tauri 2.0 sidecar, llama-server (llama.cpp), reqwest (HTTP client), sysinfo (hardware detection), Tauri events (streaming), React chat UI

---

## File Structure

```text
src-tauri/
├── src/
│   ├── lib.rs                    # Updated: register new commands + plugins
│   ├── main.rs                   # Unchanged
│   ├── sidecar.rs                # Sidecar lifecycle: start, stop, health check
│   ├── ai.rs                     # AI request routing, SSE parsing, prompt building
│   └── hardware.rs               # GPU/RAM detection, tier classification
├── Cargo.toml                    # Add: reqwest, sysinfo, futures-util
├── binaries/                     # llama-server binaries per platform
│   └── llama-server-{triple}     # Downloaded during build/setup
src/
├── components/
│   ├── chat/
│   │   ├── ChatPanel.tsx         # Chat container: messages + input
│   │   ├── ChatMessage.tsx       # Single message bubble
│   │   └── ChatInput.tsx         # Prompt input with send button
│   └── layout/
│       └── TopBar.tsx            # Updated: add generation status indicator
├── pages/
│   └── ProjectPage.tsx           # Updated: wire ChatPanel to preview
├── stores/
│   ├── projectStore.ts           # Updated: add snapshot creation
│   ├── chatStore.ts              # Chat messages, streaming state
│   └── aiStore.ts                # Sidecar status, hardware info
├── hooks/
│   └── useAiStream.ts            # Hook: invoke AI, listen to stream events
└── lib/
    └── prompts.ts                # System prompts for generation/editing
```

---

### Task 1: Rust dependencies and module structure

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/sidecar.rs`
- Create: `src-tauri/src/ai.rs`
- Create: `src-tauri/src/hardware.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add Rust dependencies**

Add to `src-tauri/Cargo.toml` under `[dependencies]`:

```toml
reqwest = { version = "0.12", features = ["json", "stream"] }
futures-util = "0.3"
sysinfo = "0.35"
tauri-plugin-shell = "2"
```

- [ ] **Step 2: Create hardware.rs**

Create `src-tauri/src/hardware.rs`:

```rust
use serde::Serialize;
use sysinfo::System;

#[derive(Debug, Clone, Serialize)]
pub struct HardwareInfo {
    pub total_ram_gb: f64,
    pub cpu_cores: usize,
    pub gpu_type: GpuType,
    pub tier: HardwareTier,
    pub recommended_quantization: String,
}

#[derive(Debug, Clone, Serialize)]
pub enum GpuType {
    Metal,
    Nvidia { vram_gb: f64 },
    Cpu,
}

#[derive(Debug, Clone, Serialize)]
pub enum HardwareTier {
    Minimum,
    Recommended,
    Optimal,
}

pub fn detect_hardware() -> HardwareInfo {
    let mut system = System::new_all();
    system.refresh_all();

    let total_ram_gb = system.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
    let cpu_cores = system.cpus().len();
    let gpu_type = detect_gpu(total_ram_gb);

    let tier = classify_tier(total_ram_gb, &gpu_type);
    let recommended_quantization = match tier {
        HardwareTier::Minimum => "Q2_K".to_string(),
        HardwareTier::Recommended => "Q4_K_M".to_string(),
        HardwareTier::Optimal => "Q4_K_M".to_string(),
    };

    HardwareInfo {
        total_ram_gb,
        cpu_cores,
        gpu_type,
        tier,
        recommended_quantization,
    }
}

fn detect_gpu(total_ram_gb: f64) -> GpuType {
    // Check NVIDIA via nvidia-smi
    if let Ok(output) = std::process::Command::new("nvidia-smi")
        .args(["--query-gpu=memory.total", "--format=csv,noheader,nounits"])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Ok(vram_mb) = stdout.trim().lines().next().unwrap_or("0").trim().parse::<f64>()
            {
                return GpuType::Nvidia {
                    vram_gb: vram_mb / 1024.0,
                };
            }
        }
    }

    // Check Apple Silicon via sysctl
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("sysctl")
            .args(["-n", "machdep.cpu.brand_string"])
            .output()
        {
            let brand = String::from_utf8_lossy(&output.stdout);
            if brand.contains("Apple") {
                return GpuType::Metal;
            }
        }
    }

    GpuType::Cpu
}

fn classify_tier(total_ram_gb: f64, gpu_type: &GpuType) -> HardwareTier {
    match gpu_type {
        GpuType::Nvidia { vram_gb } if *vram_gb >= 8.0 && total_ram_gb >= 32.0 => {
            HardwareTier::Optimal
        }
        GpuType::Nvidia { vram_gb } if *vram_gb >= 6.0 => HardwareTier::Recommended,
        GpuType::Metal if total_ram_gb >= 32.0 => HardwareTier::Optimal,
        GpuType::Metal if total_ram_gb >= 16.0 => HardwareTier::Recommended,
        _ if total_ram_gb >= 8.0 => HardwareTier::Minimum,
        _ => HardwareTier::Minimum,
    }
}

#[tauri::command]
pub fn get_hardware_info() -> HardwareInfo {
    detect_hardware()
}
```

- [ ] **Step 3: Create sidecar.rs**

Create `src-tauri/src/sidecar.rs`:

```rust
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

pub struct SidecarState {
    pub child: Mutex<Option<CommandChild>>,
    pub port: Mutex<u16>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
            port: Mutex::new(8080),
        }
    }
}

#[tauri::command]
pub async fn start_sidecar(
    app: AppHandle,
    model_path: String,
    port: Option<u16>,
) -> Result<u16, String> {
    let state = app.state::<SidecarState>();

    // Already running?
    if state.child.lock().unwrap().is_some() {
        return Ok(*state.port.lock().unwrap());
    }

    let port = port.unwrap_or(8080);

    let (mut rx, child) = app
        .shell()
        .sidecar("llama-server")
        .map_err(|e| format!("Failed to create sidecar command: {e}"))?
        .args([
            "-m",
            &model_path,
            "--port",
            &port.to_string(),
            "--host",
            "127.0.0.1",
            "-ngl",
            "99",
        ])
        .spawn()
        .map_err(|e| format!("Failed to spawn llama-server: {e}"))?;

    *state.child.lock().unwrap() = Some(child);
    *state.port.lock().unwrap() = port;

    // Monitor sidecar output in background
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        use tauri::Emitter;
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                    let text = String::from_utf8_lossy(&line);
                    let _ = app_handle.emit("sidecar-log", text.to_string());
                }
                tauri_plugin_shell::process::CommandEvent::Terminated(status) => {
                    let _ = app_handle.emit("sidecar-terminated", format!("{:?}", status));
                    let state = app_handle.state::<SidecarState>();
                    *state.child.lock().unwrap() = None;
                    break;
                }
                _ => {}
            }
        }
    });

    // Wait for server to be ready (poll health endpoint)
    let client = reqwest::Client::new();
    let health_url = format!("http://127.0.0.1:{port}/health");
    for _ in 0..60 {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        if let Ok(resp) = client.get(&health_url).send().await {
            if resp.status().is_success() {
                return Ok(port);
            }
        }
    }

    // Timeout — kill and report
    stop_sidecar(app).await?;
    Err("llama-server failed to start within 30 seconds".to_string())
}

#[tauri::command]
pub async fn stop_sidecar(app: AppHandle) -> Result<(), String> {
    let state = app.state::<SidecarState>();
    if let Some(child) = state.child.lock().unwrap().take() {
        child.kill().map_err(|e| format!("Failed to kill sidecar: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn sidecar_status(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<SidecarState>();
    Ok(state.child.lock().unwrap().is_some())
}
```

- [ ] **Step 4: Create ai.rs**

Create `src-tauri/src/ai.rs`:

```rust
use futures_util::StreamExt;
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct AiChunk {
    pub token: String,
    pub done: bool,
}

#[derive(Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[tauri::command]
pub async fn stream_generate(
    app: AppHandle,
    port: u16,
    system_prompt: String,
    messages: Vec<serde_json::Value>,
    max_tokens: Option<i32>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{port}/v1/chat/completions");

    let mut all_messages = vec![serde_json::json!({
        "role": "system",
        "content": system_prompt,
    })];
    all_messages.extend(messages);

    let body = serde_json::json!({
        "messages": all_messages,
        "stream": true,
        "temperature": 0.7,
        "max_tokens": max_tokens.unwrap_or(-1),
    });

    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("llama-server returned {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut full_response = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("Stream error: {e}"))?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if !line.starts_with("data: ") {
                continue;
            }

            let json_str = &line[6..];
            if json_str == "[DONE]" {
                let _ = app.emit("ai-chunk", AiChunk {
                    token: String::new(),
                    done: true,
                });
                return Ok(full_response);
            }

            if let Ok(data) = serde_json::from_str::<serde_json::Value>(json_str) {
                if let Some(content) = data
                    .get("choices")
                    .and_then(|c| c.get(0))
                    .and_then(|c| c.get("delta"))
                    .and_then(|d| d.get("content"))
                    .and_then(|c| c.as_str())
                {
                    full_response.push_str(content);
                    let _ = app.emit("ai-chunk", AiChunk {
                        token: content.to_string(),
                        done: false,
                    });
                }
            }
        }
    }

    Ok(full_response)
}
```

- [ ] **Step 5: Update lib.rs**

Replace `src-tauri/src/lib.rs`:

```rust
mod ai;
mod hardware;
mod sidecar;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .manage(sidecar::SidecarState::default())
        .invoke_handler(tauri::generate_handler![
            sidecar::start_sidecar,
            sidecar::stop_sidecar,
            sidecar::sidecar_status,
            ai::stream_generate,
            hardware::get_hardware_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 6: Re-add shell permissions**

Update `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-execute",
    "sql:allow-select",
    "shell:allow-spawn",
    "shell:allow-execute"
  ]
}
```

- [ ] **Step 7: Verify Rust compiles**

```bash
cd src-tauri && cargo check
```

Expected: compiles with no errors.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/
git commit -m "feat: add Rust backend for sidecar, AI streaming, and hardware detection

- sidecar.rs: start/stop llama-server, health polling, status tracking
- ai.rs: stream_generate with SSE parsing, Tauri event emission
- hardware.rs: RAM/GPU detection, tier classification, quantization recommendation
- Re-added shell plugin for sidecar spawning"
```

---

### Task 2: System prompts

**Files:**
- Create: `src/lib/prompts.ts`

- [ ] **Step 1: Create prompt templates**

Create `src/lib/prompts.ts`:

```typescript
export const SYSTEM_PROMPTS = {
  generate: `You are a web developer AI. Generate a complete, single-file HTML page with inline CSS and JavaScript.

Rules:
- Output ONLY valid HTML. No markdown, no explanation, no code fences.
- Start with <!DOCTYPE html> and end with </html>.
- All CSS must be in a <style> tag in <head>.
- All JavaScript must be in a <script> tag before </body>.
- Use modern CSS (flexbox, grid, custom properties).
- Make the page fully responsive.
- Use semantic HTML elements (header, main, section, footer, nav, article).
- Each major section should be a direct child of <body> or <main>.
- Include placeholder text that matches the site's purpose.
- Design should be clean, modern, and professional.`,

  editFull: `You are a web developer AI. You will receive the current HTML of a page and a user request to modify it.

Rules:
- Output ONLY the complete modified HTML page. No markdown, no explanation, no code fences.
- Start with <!DOCTYPE html> and end with </html>.
- Preserve the existing structure and content unless the user specifically asks to change it.
- Apply the requested changes precisely.
- Keep all existing styles and scripts unless they conflict with the change.`,

  editSection: `You are a web developer AI. You will receive the HTML of a single section and a user request to modify it.

Rules:
- Output ONLY the modified HTML section. No markdown, no explanation, no code fences.
- Output a single HTML element (the section) with its contents.
- Preserve the existing structure unless the user specifically asks to change it.
- Keep inline styles consistent with what was provided.
- Do not add <!DOCTYPE>, <html>, <head>, or <body> tags.`,
} as const;

export function buildGenerateMessages(
  userPrompt: string,
  siteType: string
): Array<{ role: string; content: string }> {
  return [
    {
      role: 'user',
      content: `Create a ${siteType} website: ${userPrompt}`,
    },
  ];
}

export function buildEditMessages(
  currentHtml: string,
  chatHistory: Array<{ role: string; content: string }>,
  userPrompt: string
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    {
      role: 'user',
      content: `Here is the current HTML of the page:\n\n${currentHtml}`,
    },
    {
      role: 'assistant',
      content: 'I see the current page. What would you like me to change?',
    },
  ];

  // Add recent chat history (last 6 messages max to save context)
  const recentHistory = chatHistory.slice(-6);
  messages.push(...recentHistory);

  messages.push({
    role: 'user',
    content: userPrompt,
  });

  return messages;
}

export function buildSectionEditMessages(
  sectionHtml: string,
  userPrompt: string
): Array<{ role: string; content: string }> {
  return [
    {
      role: 'user',
      content: `Here is the HTML of the section to modify:\n\n${sectionHtml}\n\nChange request: ${userPrompt}`,
    },
  ];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/prompts.ts
git commit -m "feat: add system prompts for generation and editing"
```

---

### Task 3: Frontend AI and chat stores

**Files:**
- Create: `src/stores/aiStore.ts`
- Create: `src/stores/chatStore.ts`
- Create: `src/hooks/useAiStream.ts`

- [ ] **Step 1: Create aiStore**

Create `src/stores/aiStore.ts`:

```typescript
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

export const useAiStore = create<AiState>((set, get) => ({
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
```

- [ ] **Step 2: Create chatStore**

Create `src/stores/chatStore.ts`:

```typescript
import { create } from 'zustand';
import { getDatabase } from '../db/database';
import type { ChatMessage } from '../types/project';

interface ChatState {
  messages: ChatMessage[];
  streaming: boolean;
  streamBuffer: string;
  loadMessages: (projectId: string) => Promise<void>;
  addMessage: (
    projectId: string,
    role: 'user' | 'assistant',
    content: string,
    editType?: 'chat' | 'inline' | 'wysiwyg' | null
  ) => Promise<ChatMessage>;
  setStreaming: (streaming: boolean) => void;
  appendToStream: (token: string) => void;
  finalizeStream: (projectId: string) => Promise<ChatMessage>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  streaming: false,
  streamBuffer: '',

  loadMessages: async (projectId: string) => {
    const db = await getDatabase();
    const messages = await db.select<ChatMessage[]>(
      'SELECT * FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    set({ messages });
  },

  addMessage: async (projectId, role, content, editType = null) => {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO chat_messages (id, project_id, role, content, edit_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, projectId, role, content, editType, now]
    );
    const message: ChatMessage = {
      id,
      project_id: projectId,
      role,
      content,
      edit_type: editType,
      created_at: now,
    };
    set((state) => ({ messages: [...state.messages, message] }));
    return message;
  },

  setStreaming: (streaming) => {
    set({ streaming, streamBuffer: streaming ? '' : get().streamBuffer });
  },

  appendToStream: (token) => {
    set((state) => ({ streamBuffer: state.streamBuffer + token }));
  },

  finalizeStream: async (projectId) => {
    const { streamBuffer, addMessage } = get();
    const message = await addMessage(projectId, 'assistant', streamBuffer, 'chat');
    set({ streaming: false, streamBuffer: '' });
    return message;
  },

  clearMessages: () => {
    set({ messages: [], streaming: false, streamBuffer: '' });
  },
}));
```

- [ ] **Step 3: Create useAiStream hook**

Create `src/hooks/useAiStream.ts`:

```typescript
import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useChatStore } from '../stores/chatStore';
import { useAiStore } from '../stores/aiStore';
import { useProjectStore } from '../stores/projectStore';

interface AiChunk {
  token: string;
  done: boolean;
}

export function useAiStream() {
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const sidecarPort = useAiStore((s) => s.sidecarPort);
  const sidecarStatus = useAiStore((s) => s.sidecarStatus);
  const { setStreaming, appendToStream, finalizeStream } = useChatStore();
  const updateProjectHtml = useProjectStore((s) => s.updateProjectHtml);

  useEffect(() => {
    return () => {
      unlistenRef.current?.();
    };
  }, []);

  const generate = useCallback(
    async (
      projectId: string,
      systemPrompt: string,
      messages: Array<{ role: string; content: string }>,
      maxTokens?: number
    ): Promise<string | null> => {
      if (sidecarStatus !== 'running') {
        console.error('Sidecar not running');
        return null;
      }

      setStreaming(true);

      // Listen for chunks
      unlistenRef.current = await listen<AiChunk>('ai-chunk', (event) => {
        if (!event.payload.done) {
          appendToStream(event.payload.token);
        }
      });

      try {
        const fullHtml = await invoke<string>('stream_generate', {
          port: sidecarPort,
          systemPrompt,
          messages,
          maxTokens: maxTokens ?? null,
        });

        // Save assistant message and update project
        await finalizeStream(projectId);
        await updateProjectHtml(projectId, fullHtml);

        return fullHtml;
      } catch (error) {
        console.error('AI generation failed:', error);
        setStreaming(false);
        return null;
      } finally {
        unlistenRef.current?.();
        unlistenRef.current = null;
      }
    },
    [sidecarPort, sidecarStatus, setStreaming, appendToStream, finalizeStream, updateProjectHtml]
  );

  return { generate };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/aiStore.ts src/stores/chatStore.ts src/hooks/useAiStream.ts
git commit -m "feat: add AI and chat stores with streaming hook"
```

---

### Task 4: Chat panel UI components

**Files:**
- Create: `src/components/chat/ChatMessage.tsx`
- Create: `src/components/chat/ChatInput.tsx`
- Create: `src/components/chat/ChatPanel.tsx`

- [ ] **Step 1: Create ChatMessage component**

Create `src/components/chat/ChatMessage.tsx`:

```typescript
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
          isUser
            ? 'bg-[var(--color-accent)] text-white rounded-br-sm'
            : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] rounded-bl-sm'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatInput component**

Create `src/components/chat/ChatInput.tsx`:

```typescript
import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Describe what you want...',
}: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-2 border-t border-[var(--color-border)]">
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-xs p-2 rounded-lg resize-none outline-none placeholder:text-[var(--color-text-secondary)] disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 rounded-lg text-xs transition-colors"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ChatPanel component**

Create `src/components/chat/ChatPanel.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChatStore } from '../../stores/chatStore';
import { useAiStore } from '../../stores/aiStore';
import { useProjectStore } from '../../stores/projectStore';
import { useAiStream } from '../../hooks/useAiStream';
import {
  SYSTEM_PROMPTS,
  buildGenerateMessages,
  buildEditMessages,
} from '../../lib/prompts';

export function ChatPanel() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const { messages, streaming, streamBuffer, loadMessages, addMessage } =
    useChatStore();
  const sidecarStatus = useAiStore((s) => s.sidecarStatus);
  const { generate } = useAiStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentProject) {
      loadMessages(currentProject.id);
    }
  }, [currentProject?.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamBuffer]);

  const handleSend = async (text: string) => {
    if (!currentProject) return;

    await addMessage(currentProject.id, 'user', text, 'chat');

    const hasHtml = currentProject.html.length > 0;

    if (hasHtml) {
      // Edit existing page
      const chatHistory = messages
        .filter((m) => m.edit_type === 'chat')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      await generate(
        currentProject.id,
        SYSTEM_PROMPTS.editFull,
        buildEditMessages(currentProject.html, chatHistory, text)
      );
    } else {
      // Generate new page
      await generate(
        currentProject.id,
        SYSTEM_PROMPTS.generate,
        buildGenerateMessages(text, currentProject.site_type)
      );
    }
  };

  const isReady = sidecarStatus === 'running';

  return (
    <div className="w-[300px] bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border)] flex flex-col">
      <div className="p-3 border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
        <span>AI Chat</span>
        <span
          className={`w-2 h-2 rounded-full ${
            sidecarStatus === 'running'
              ? 'bg-green-500'
              : sidecarStatus === 'starting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
          }`}
          title={`AI: ${sidecarStatus}`}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {messages.length === 0 && !streaming && (
          <div className="text-xs text-[var(--color-text-secondary)] text-center mt-8">
            {isReady
              ? 'Describe the website you want to create.'
              : 'Waiting for AI model to load...'}
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {streaming && streamBuffer && (
          <ChatMessage role="assistant" content={streamBuffer} />
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        disabled={!isReady || streaming}
        placeholder={
          isReady ? 'Describe what you want...' : 'AI model loading...'
        }
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/
git commit -m "feat: add ChatPanel, ChatMessage, and ChatInput components"
```

---

### Task 5: Wire chat panel into ProjectPage

**Files:**
- Modify: `src/pages/ProjectPage.tsx`
- Modify: `src/stores/projectStore.ts` (add createSnapshot)

- [ ] **Step 1: Add createSnapshot to project store**

In `src/stores/projectStore.ts`, add to the interface:

```typescript
createSnapshot: (projectId: string, html: string, description: string) => Promise<void>;
```

And add to the implementation:

```typescript
createSnapshot: async (projectId: string, html: string, description: string) => {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const rows = await db.select<Array<{ max_version: number | null }>>(
    'SELECT MAX(version) as max_version FROM snapshots WHERE project_id = ?',
    [projectId]
  );
  const nextVersion = (rows[0]?.max_version ?? 0) + 1;
  await db.execute(
    'INSERT INTO snapshots (id, project_id, html, description, version) VALUES (?, ?, ?, ?, ?)',
    [id, projectId, html, description, nextVersion]
  );
},
```

- [ ] **Step 2: Update ProjectPage to use ChatPanel**

Replace `src/pages/ProjectPage.tsx`:

```typescript
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { ChatPanel } from '../components/chat/ChatPanel';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const currentProject = useProjectStore((s) => s.currentProject);
  const loadProjectById = useProjectStore((s) => s.loadProjectById);

  useEffect(() => {
    if (id && !currentProject) {
      loadProjectById(id);
    }
  }, [id, currentProject, loadProjectById]);

  return (
    <div className="h-full flex">
      <ChatPanel />

      {/* Preview area — placeholder until Phase 3 */}
      <div className="flex-1 flex flex-col">
        <div className="p-2 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex justify-between">
          <span>Live Preview</span>
          <span>1280 × 720</span>
        </div>
        <div className="flex-1 bg-white flex items-center justify-center">
          {currentProject?.html ? (
            <iframe
              srcDoc={currentProject.html}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts"
            />
          ) : (
            <p className="text-gray-400 text-sm">
              {currentProject
                ? 'Start by describing your website in the chat'
                : 'No project selected'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProjectPage.tsx src/stores/projectStore.ts
git commit -m "feat: wire ChatPanel into ProjectPage with basic iframe preview

ChatPanel sends prompts to AI, generated HTML displayed in iframe.
Added createSnapshot to project store for undo/redo support."
```

---

### Task 6: Sidecar binary setup script

**Files:**
- Create: `scripts/setup-sidecar.sh`
- Modify: `src-tauri/tauri.conf.json` (add externalBin)

- [ ] **Step 1: Create setup script**

Create `scripts/setup-sidecar.sh`:

```bash
#!/bin/bash
set -e

LLAMA_VERSION="b5460"
BINARIES_DIR="src-tauri/binaries"
mkdir -p "$BINARIES_DIR"

TARGET=$(rustc --print host-triple 2>/dev/null || echo "unknown")

echo "Detected target: $TARGET"
echo "Setting up llama-server for Offpage..."

case "$TARGET" in
  aarch64-apple-darwin)
    ARCHIVE="llama-${LLAMA_VERSION}-bin-macos-arm64.tar.gz"
    URL="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_VERSION}/${ARCHIVE}"
    ;;
  x86_64-apple-darwin)
    ARCHIVE="llama-${LLAMA_VERSION}-bin-macos-x64.tar.gz"
    URL="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_VERSION}/${ARCHIVE}"
    ;;
  x86_64-pc-windows-msvc)
    ARCHIVE="llama-${LLAMA_VERSION}-bin-win-vulkan-x64.zip"
    URL="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_VERSION}/${ARCHIVE}"
    ;;
  *)
    echo "Unsupported platform: $TARGET"
    exit 1
    ;;
esac

DEST="$BINARIES_DIR/llama-server-$TARGET"
if [ "$TARGET" = "x86_64-pc-windows-msvc" ]; then
  DEST="${DEST}.exe"
fi

if [ -f "$DEST" ]; then
  echo "llama-server already exists at $DEST"
  exit 0
fi

echo "Downloading $URL..."
TMP_DIR=$(mktemp -d)
curl -L -o "$TMP_DIR/$ARCHIVE" "$URL"

echo "Extracting..."
case "$ARCHIVE" in
  *.tar.gz)
    tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR"
    cp "$TMP_DIR/build/bin/llama-server" "$DEST"
    ;;
  *.zip)
    unzip -o "$TMP_DIR/$ARCHIVE" -d "$TMP_DIR/extracted"
    cp "$TMP_DIR/extracted/build/bin/llama-server.exe" "$DEST"
    ;;
esac

chmod +x "$DEST"
rm -rf "$TMP_DIR"

echo "llama-server installed at $DEST"
```

- [ ] **Step 2: Add externalBin to tauri.conf.json**

In `src-tauri/tauri.conf.json`, add under `"bundle"`:

```json
"externalBin": ["binaries/llama-server"]
```

- [ ] **Step 3: Add binaries to gitignore**

Append to `.gitignore`:

```gitignore
# Sidecar binaries (downloaded, not committed)
src-tauri/binaries/
```

- [ ] **Step 4: Commit**

```bash
chmod +x scripts/setup-sidecar.sh
git add scripts/setup-sidecar.sh src-tauri/tauri.conf.json .gitignore
git commit -m "feat: add sidecar setup script and Tauri externalBin config

scripts/setup-sidecar.sh downloads platform-specific llama-server binary.
Supports macOS arm64/x64 and Windows x64."
```

---

## Phase Summary

After completing all tasks, you will have:
- **Rust backend**: sidecar management (start/stop/health), AI streaming (SSE parsing + Tauri events), hardware detection (GPU/RAM/tier)
- **Frontend stores**: aiStore (sidecar status), chatStore (messages + streaming), useAiStream hook
- **Chat UI**: ChatPanel with message history, streaming display, send button
- **System prompts**: for generation, full-page edit, and section edit
- **ProjectPage**: ChatPanel wired in, basic iframe preview of generated HTML
- **Sidecar setup**: download script for llama-server, Tauri externalBin config
- Ready for Phase 3 (preview iframe with helper script, inline edit, WYSIWYG)
