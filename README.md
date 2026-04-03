<div align="center">

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo-light.svg">
  <img alt="Offpage" src="docs/assets/logo-dark.svg" width="200">
</picture>

<br><br>

### Generate websites with AI — entirely on your device.

No cloud. No API keys. No subscriptions. Full privacy.

<br>

[![GitHub Stars](https://img.shields.io/github/stars/Szymon0C/Offpage?style=flat&logo=github&color=f5c542)](https://github.com/Szymon0C/Offpage)
[![Windows](https://img.shields.io/badge/-Windows-0078D6?style=flat&logo=windows11&logoColor=white)](#download)
[![macOS](https://img.shields.io/badge/-macOS-000000?style=flat&logo=apple&logoColor=white)](#download)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri-FFC131?style=flat&logo=tauri&logoColor=white)](https://tauri.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat)](#license)

<br>

<img src="docs/assets/preview.png" alt="Offpage Preview" width="720">

<sub>screenshot coming soon</sub>

<br><br>

[**Download**](#download) &nbsp;&middot;&nbsp; [**Getting Started**](#getting-started) &nbsp;&middot;&nbsp; [**Features**](#features) &nbsp;&middot;&nbsp; [**Contributing**](#contributing)

<br>

</div>

---

## Features

<table>
<tr>
<td width="50%" valign="top">

**Prompt to page** &mdash; Describe what you want, AI generates the entire website from scratch.

**Template gallery** &mdash; Start from curated templates and customize with natural language.

**Chat editing** &mdash; *"Make the header dark blue and add a CTA button"* &mdash; done.

</td>
<td width="50%" valign="top">

**Inline editing** &mdash; Click any section, prompt changes just for that part.

**Visual editing** &mdash; Edit text directly on the page &mdash; WYSIWYG, no code.

**One-click deploy** &mdash; Publish to Netlify, Vercel, or GitHub Pages instantly.

</td>
</tr>
</table>

> Output is a single HTML file with inline CSS/JS &mdash; works everywhere.
> Supports landing pages, portfolios, blogs, and static e-commerce.

<br>

## How It Works

```
  You type a prompt
       │
       ▼
  ┌──────────┐    Tauri IPC    ┌──────────────┐    HTTP    ┌──────────────┐
  │ Frontend  │ ◄────────────► │  Rust Core   │ ◄───────► │ llama.cpp    │
  │ React 19  │                │  (Tauri 2.0) │           │ (local AI)   │
  └──────────┘                 └──────────────┘           └──────────────┘
       │                              │
       │ postMessage                  │ SQLite
       ▼                              ▼
  ┌──────────┐                 ┌──────────────┐
  │ Preview  │                 │  Storage     │
  │ (iframe) │                 │  Projects    │
  └──────────┘                 └──────────────┘
```

Everything runs locally. The AI model is downloaded once and stays on your machine.

<br>

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend** | React 19 &middot; TypeScript &middot; Vite &middot; Tailwind CSS 4 &middot; Zustand |
| **Desktop** | Tauri 2.0 (Rust) |
| **AI** | llama.cpp sidecar &middot; Qwen2.5-Coder-7B (3B fallback) |
| **GPU** | Metal (macOS) &middot; CUDA / Vulkan (Windows) |
| **Storage** | SQLite |
| **Deploy** | Netlify &middot; Vercel &middot; GitHub Pages |

<br>

## Getting Started

### Prerequisites

- **Node.js** 18+ &mdash; [nodejs.org](https://nodejs.org)
- **Rust** &mdash; [rustup.rs](https://rustup.rs)
- **pnpm** (recommended) or npm

<details>
<summary><strong>macOS extras</strong></summary>

```bash
xcode-select --install
```

</details>

<details>
<summary><strong>Windows extras</strong></summary>

Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

</details>

### Clone & Install

```bash
git clone https://github.com/Szymon0C/Offpage.git
cd Offpage
pnpm install        # or: npm install
```

### Download the AI sidecar

```bash
bash scripts/setup-sidecar.sh
```

This downloads the pre-built `llama-server` binary for your platform (~50 MB).

### Run in development

```bash
pnpm tauri dev      # or: npx tauri dev
```

The app will open automatically. On first launch:

1. Hardware detection runs automatically
2. Choose a model (7B recommended for 16 GB+ RAM, 3B for 8 GB)
3. Click **Download & Start AI** &mdash; one-time download from Hugging Face
4. Start chatting!

### Build for production

```bash
pnpm tauri build    # or: npx tauri build
```

Builds a distributable `.dmg` (macOS) or `.msi` / `.exe` (Windows) in `src-tauri/target/release/bundle/`.

<br>

## Hardware Requirements

| | Hardware | Experience |
|:--|:---------|:-----------|
| **Minimum** | 8 GB RAM, x64 (AVX2) or Apple Silicon | Works &mdash; CPU inference, slower |
| **Recommended** | 16 GB RAM, 6 GB+ VRAM or M1+ | Smooth generation |
| **Optimal** | 32 GB RAM, RTX 3060+ or M1 Pro+ | Fast, room for larger models |

The app detects your hardware and adjusts automatically (quantization, model size).

<br>

## Project Structure

```
Offpage/
├── src/                    # React frontend
│   ├── components/         # UI components (chat, preview, deploy, templates)
│   ├── stores/             # Zustand state (project, chat, editor, ai, deploy)
│   ├── pages/              # Route pages (Home, Project, Templates, Settings)
│   ├── hooks/              # Custom hooks (useAiStream)
│   ├── lib/                # Utilities (prompts, templates, deploy providers)
│   └── db/                 # SQLite database, migrations
├── src-tauri/              # Rust backend
│   └── src/
│       ├── ai.rs           # SSE streaming from llama-server
│       ├── sidecar.rs      # llama-server lifecycle management
│       ├── models.rs       # Model download & management
│       ├── deploy.rs       # Deploy to Netlify/Vercel/GitHub Pages
│       └── hardware.rs     # Hardware detection (RAM, GPU, CPU)
├── scripts/                # Setup scripts
└── docs/                   # Specs, plans, assets
```

<br>

## Contributing

Contributions are welcome! This project is in early development &mdash; there's plenty to do.

```bash
# Fork & clone the repo, then:
pnpm install
bash scripts/setup-sidecar.sh
pnpm tauri dev
```

Please open an issue before submitting large PRs so we can discuss the approach.

<br>

## Download

> **Coming soon** &mdash; Early development builds will be available once the core features are stable.

Watch this repo or star it to get notified.

<br>

## License

MIT &mdash; see [LICENSE](LICENSE) for details.

<br>

<div align="center">

<sub>Built with Tauri, React, and local AI. No data leaves your device.</sub>

</div>
