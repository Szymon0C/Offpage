# Offpage MVP — Design Specification

## Overview

Offpage is a cross-platform desktop application (Windows + macOS) that generates websites using AI running entirely on-device. Users describe what they want in natural language — the app builds a complete website, lets them iterate through chat, inline prompts, and visual editing, then deploy with one click.

**Target user:** Non-technical — freelancers, small business owners, creators who want a website without coding.

**Output format:** Single HTML file with inline CSS/JS.

**Site types:** Landing pages, portfolios, blogs, static e-commerce.

## Tech Stack

### Desktop & Backend (Rust)

- **Tauri 2.0** — desktop framework, cross-platform shell
- **llama.cpp** — AI runtime, bundled as Tauri sidecar binary
- **Qwen2.5-Coder 7B** — primary AI model (3B fallback for low-end hardware)
- **SQLite** — local database (via tauri-plugin-sql)
- **GPU acceleration** — Metal on macOS, CUDA/Vulkan on Windows

### Frontend (Webview)

- **React 19** — UI framework
- **TypeScript** — type safety across IPC and postMessage boundaries
- **Vite** — bundler (Tauri-recommended)
- **Tailwind CSS 4** — app UI styling (isolated from user's page in iframe)
- **Zustand** — state management
- **Pretext** — text measurement without DOM reflow
- **React Router 7** — in-app navigation

## Architecture

Three-layer architecture with clear isolation boundaries:

### Layer 1: Tauri Shell (Rust)

Six backend modules exposed to the frontend via Tauri IPC:

- **File Manager** — read/write project HTML files, manage templates on disk, handle file export
- **AI Sidecar Manager** — start/stop llama-server process, health checks, route HTTP requests to sidecar, stream responses back via Tauri events
- **Deploy Service** — OAuth flow for providers, upload HTML via provider APIs (Netlify, Vercel, GitHub Pages)
- **Hardware Detector** — detect GPU type, VRAM, system RAM at startup. Determine hardware tier and optimal quantization level
- **Project Store** — SQLite database access. CRUD for projects, snapshots, chat messages, templates, settings
- **Auto Updater** — Tauri built-in updater for app updates + template catalog updates

### Layer 2: Frontend (Webview)

Three main UI modules:

- **Chat Panel** — conversation UI with AI. Streaming token display, prompt input, chat history. Sends prompts to Rust via IPC, receives streamed HTML back
- **Preview Manager** — controls the preview iframe. Injects HTML content, handles postMessage communication, manages responsive viewport toggle (mobile/tablet/desktop)
- **WYSIWYG Engine** — activates contentEditable overlays inside the iframe for direct text, color, and image editing. Syncs changes back to app state via postMessage

### Layer 3: Preview iframe (isolated)

Sandboxed iframe containing the user's generated HTML page:

- **User's HTML** — the actual generated page, fully isolated from app CSS/JS
- **Offpage Helper Script** — injected script that enables section detection (walks the DOM for top-level semantic elements: `<header>`, `<section>`, `<footer>`, `<main>`, `<nav>`, `<article>`, and direct children of `<body>` with significant content), click handling (catches user clicks on detected sections), edit overlays (shows "Edit section" button on hover), and selection highlighting

### Communication

- **Frontend ↔ Rust:** Tauri IPC (invoke for commands, events for streaming)
- **Frontend ↔ iframe:** postMessage API (bidirectional)

## Application Layout

- **Icon sidebar** (48px, left) — navigation: Home, Projects, Templates, Settings
- **Chat panel** (300px, resizable, left of preview) — AI conversation, prompt input at bottom
- **Preview iframe** (remaining width) — isolated page preview with edit overlays
- **Top bar** — project name, responsive toggle (mobile/tablet/desktop), Deploy button

The chat panel is collapsible to give full preview width.

## Core Flows

### 1. Generate from Prompt

User describes the page in chat → system prompt + site type + user prompt sent to llama-server → HTML streamed token-by-token → rendered live in preview iframe.

### 2. Generate from Template

User picks a template from the gallery → template HTML loaded as context + user's customization prompt → llama-server modifies the template → result rendered in iframe.

### 3. Chat Edit

User types a change request in chat (e.g., "make the background darker") → system prompt + current full HTML + recent chat history + user prompt → llama-server returns updated HTML → replaces content in iframe. Full page HTML is sent so the model has complete context for global changes.

### 4. Inline Edit

User clicks a section in the preview → "Edit section" overlay appears → user types a prompt for that section → only that section's HTML is sent to llama-server (not the full page) → returned HTML replaces just that section in the DOM. Saves tokens and is faster than full-page regeneration.

### 5. WYSIWYG Edit

User clicks text/element in preview → contentEditable activates → user directly edits text, changes colors, swaps images → changes synced back to app state via postMessage. No AI involved — direct DOM manipulation.

### 6. Deploy

1. User clicks "Deploy" in top bar → modal with provider selection (Netlify, Vercel, GitHub Pages)
2. First time: OAuth flow in system browser → token encrypted and stored in SQLite via OS keychain (Tauri plugin-keychain)
3. Upload: Deploy Service sends HTML via provider's API → progress bar in modal
4. Success: shows live URL + "Open" and "Copy link" buttons
5. Subsequent deploys update the same site (project stores provider + site ID)

**Provider details:**
- Netlify — Deploy API, single POST with file upload
- Vercel — Deployments API, requires project setup on first deploy
- GitHub Pages — creates/updates repo + enables Pages via GitHub API

## Data Model (SQLite)

### projects
- `id` TEXT PRIMARY KEY
- `name` TEXT
- `html` TEXT — current page HTML
- `template_id` TEXT nullable — source template if any
- `site_type` TEXT — landing / portfolio / blog / ecommerce
- `deploy_config` JSON nullable — {provider, site_id, url}
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### snapshots
- `id` TEXT PRIMARY KEY
- `project_id` TEXT FK → projects
- `html` TEXT — HTML snapshot
- `description` TEXT — human-readable change description
- `version` INTEGER — sequential ordering
- `created_at` TIMESTAMP

Every AI edit creates a new snapshot. Enables undo/redo by navigating version history.

### chat_messages
- `id` TEXT PRIMARY KEY
- `project_id` TEXT FK → projects
- `role` TEXT — user / assistant
- `content` TEXT — message content
- `edit_type` TEXT nullable — chat / inline / wysiwyg
- `created_at` TIMESTAMP

### templates
- `id` TEXT PRIMARY KEY
- `name` TEXT
- `category` TEXT — landing / portfolio / blog / ecommerce
- `html` TEXT — template HTML
- `thumbnail` BLOB — preview image
- `version` TEXT

Templates are bundled with the app and updated via Auto Updater. Future: AI-generated templates.

### settings
- `key` TEXT PRIMARY KEY
- `value` JSON

Stores: hardware_tier, quantization level, deploy tokens (encrypted), UI theme, etc.

## Hardware Requirements

| Tier | Hardware | Experience |
|------|----------|------------|
| Minimum | 8 GB RAM, x64 with AVX2 / Apple Silicon | CPU inference, slower |
| Recommended | 16 GB RAM, 6 GB+ VRAM / M1+ | Smooth generation |
| Optimal | 32 GB RAM, RTX 3060+ / M1 Pro+ | Fast, larger models possible |

The app detects hardware at startup and adjusts automatically:
- Quantization: Q4_K_M for recommended+, Q2_K for minimum tier
- Model: 7B for recommended+, 3B fallback if insufficient RAM

Future: support for <8 GB RAM via smaller models (1.5B), aggressive quantization, disk offloading (mmap).

## Error Handling

### AI / llama-server
- **Sidecar fails to start:** User-friendly message with hardware requirements, suggest smaller model (3B) if insufficient RAM
- **Generation timeout (120s):** Show "Taking too long" + retry button. Preserve last good state
- **Broken HTML output:** Validate HTML before injecting into iframe. If invalid, rollback to last snapshot and notify in chat
- **Context window exceeded:** Auto-trim chat history. For very large pages, suggest inline edit instead of full chat edit

### Deploy
- **No internet:** Detect offline before deploy attempt. Offer local file export as alternative
- **Expired token:** Automatic re-auth flow. If fails, prompt re-login
- **API error/rate limit:** Retry with exponential backoff (max 3 attempts). Fallback to local export

### Application
- **Crash recovery:** Auto-save to SQLite every 30 seconds. On restart, detect unsaved changes and offer recovery
- **Insufficient disk space:** Check before model download. Show required space in message
- **First launch onboarding:** Wizard flow — download model (~4 GB), detect hardware, set optimal configuration. Progress bar with ETA

### Principles
- Never lose user's work (auto-save + snapshots)
- User-friendly messages (no stack traces, clear next action)
- Graceful degradation (if AI fails, offer manual alternatives)

## Testing Strategy

### Unit Tests (most coverage)
- **Frontend (Vitest):** Zustand stores, prompt builder logic, HTML validator, postMessage serialization
- **Rust (cargo test):** File manager, sidecar manager config, deploy service request building, SQLite CRUD

### Integration Tests
- Frontend ↔ Rust IPC: invoke commands and responses, event streaming
- App ↔ iframe: postMessage protocol, section detection, WYSIWYG edit propagation
- AI pipeline: prompt → llama-server → valid HTML, snapshot creation

### E2E Tests (least, most expensive)
- **Playwright + Tauri WebDriver:** Full generation flow, template customization, chat edit, inline edit, WYSIWYG, undo/redo, HTML export
- Mock llama-server in CI (no GPU needed) — returns predefined HTML
- Real model for nightly smoke tests only

### CI
- GitHub Actions: unit + integration on every PR, E2E nightly
- Mock llama-server for deterministic CI runs

## Templates

Bundled with the app at v1. Categories: landing, portfolio, blog, e-commerce.

Future roadmap: AI-generated templates on demand based on category/description.

## Out of Scope (post-MVP)

- Multi-page site support
- Code editor inside the app
- Custom domain configuration
- Collaboration / multi-user
- Template marketplace
- Support for hardware <8 GB RAM
- AI-generated templates
