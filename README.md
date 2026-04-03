<div align="center">

# Offpage

**Generate websites with AI — entirely on your device.**

No cloud. No API calls. Full privacy.

[![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](#)
[![macOS](https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-TBD-444?style=for-the-badge)](#)

<br>

<img src="docs/assets/preview.png" alt="Offpage Preview" width="720">

<sub>^ screenshot coming soon</sub>

</div>

<br>

## Features

<table>
<tr>
<td width="50%">

### Generate from a prompt
Describe what you want — AI builds the entire page from scratch.

### Start from templates
Pick a template, customize it with natural language.

### Chat editing
*"Change the header to dark blue"* — and it's done.

</td>
<td width="50%">

### Inline editing
Click any section on the page, prompt changes just for that part.

### Visual editing
Edit text, colors, and images directly — no code needed.

### One-click deploy
Publish to Netlify, Vercel, or GitHub Pages instantly.

</td>
</tr>
</table>

> Supports landing pages, portfolios, blogs, and static e-commerce.
> Output is a single HTML file with inline CSS/JS — works everywhere.

<br>

## Tech Stack

```
Frontend        React 19  ·  TypeScript  ·  Vite  ·  Tailwind CSS 4  ·  Zustand  ·  Pretext
Desktop         Tauri 2.0 (Rust)
AI              llama.cpp sidecar  ·  Qwen2.5-Coder 7B (3B fallback)
GPU             Metal (macOS)  ·  CUDA / Vulkan (Windows)
Storage         SQLite
```

<br>

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Tauri Shell  (Rust)                  │
│                                                      │
│   File Manager  ·  AI Sidecar  ·  Deploy Service     │
│   HW Detector   ·  SQLite Store  ·  Auto Updater     │
│                                                      │
├─────────────────────── IPC ──────────────────────────┤
│                                                      │
│                Frontend  (Webview)                    │
│                                                      │
│   Chat Panel  ·  Preview Manager  ·  WYSIWYG Engine  │
│                                                      │
├────────────────── postMessage ───────────────────────┤
│                                                      │
│             Preview iframe  (isolated)               │
│                                                      │
│        User's HTML  ·  Offpage Helper Script         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

<br>

## Hardware Requirements

| | Hardware | Experience |
|:--|:---------|:-----------|
| **Minimum** | 8 GB RAM, x64 (AVX2) or Apple Silicon | Works — CPU inference, slower |
| **Recommended** | 16 GB RAM, 6 GB+ VRAM or M1+ | Smooth generation |
| **Optimal** | 32 GB RAM, RTX 3060+ or M1 Pro+ | Fast, room for larger models |

The app detects your hardware and adjusts automatically (quantization, model size).

<br>

## Setup

### AI Model Setup

Offpage requires a Qwen2.5-Coder AI model to function. The app will automatically detect your hardware and recommend the appropriate model size.

**First Launch:**
1. Open the app
2. The app will detect your hardware automatically
3. Choose a model from the recommended options
4. Click "Download & Start AI" — the model will be downloaded and set up automatically

**Model Options:**
- **Qwen2.5-Coder-7B-Instruct** (~4.3 GB) — Recommended for 16GB+ RAM systems
- **Qwen2.5-Coder-3B-Instruct** (~2.0 GB) — For systems with 8GB RAM

Models are downloaded from Hugging Face and stored locally in your app data directory. This is a one-time setup that requires an internet connection.

**Subsequent Launches:**
The app will automatically detect and load any previously downloaded models.

<br>

## Status

> **Early development** — architecture designed, implementation starting.

<br>

## License

TBD
