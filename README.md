# Offpage

Desktop app that generates websites using AI — running entirely on your device. No cloud, no API calls, full privacy.

Available for **Windows** and **macOS**.

## What it does

- **Generate websites from a prompt** — describe what you want, AI builds it
- **Start from templates** — pick a template, customize with AI
- **Edit with chat** — "change the header color", "add a contact section"
- **Inline editing** — click any section, prompt changes just for that part
- **Visual editing** — edit text, colors, and images directly on the page
- **One-click deploy** — publish to Netlify, Vercel, or GitHub Pages

Supports landing pages, portfolios, blogs, and static e-commerce sites. Output is a single HTML file with inline CSS/JS.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri 2.0 |
| AI runtime | llama.cpp (sidecar binary) |
| AI model | Qwen2.5-Coder 7B (3B fallback) |
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4 |
| State management | Zustand |
| Text measurement | Pretext |
| Database | SQLite |
| GPU acceleration | Metal (macOS), CUDA/Vulkan (Windows) |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Tauri Shell (Rust)             │
│  ┌────────────┐ ┌──────────────┐ ┌───────────┐  │
│  │ File Mgr   │ │ AI Sidecar   │ │ Deploy    │  │
│  │            │ │ (llama-server)│ │ Service   │  │
│  ├────────────┤ ├──────────────┤ ├───────────┤  │
│  │ HW Detect  │ │ Project Store│ │ Updater   │  │
│  │            │ │ (SQLite)     │ │           │  │
│  └────────────┘ └──────────────┘ └───────────┘  │
├──────────────────── IPC ────────────────────────┤
│               Frontend (Webview)                 │
│  ┌────────────┐ ┌──────────────┐ ┌───────────┐  │
│  │ Chat Panel │ │ Preview Mgr  │ │ WYSIWYG   │  │
│  │            │ │              │ │ Engine    │  │
│  └────────────┘ └──────────────┘ └───────────┘  │
├─────────────── postMessage ─────────────────────┤
│             Preview iframe (isolated)            │
│  ┌─────────────────┐ ┌────────────────────────┐  │
│  │ User's HTML     │ │ Offpage Helper Script  │  │
│  └─────────────────┘ └────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Hardware Requirements

| Tier | Hardware | Experience |
|------|----------|------------|
| Minimum | 8 GB RAM, x64 with AVX2 / Apple Silicon | Works, CPU inference, slower |
| Recommended | 16 GB RAM, GPU 6GB+ VRAM / M1+ | Smooth generation |
| Optimal | 32 GB RAM, RTX 3060+ / M1 Pro+ | Fast, room for larger models |

The app detects your hardware and adjusts automatically (e.g. Q2 vs Q4 quantization).

## Status

Early development — architecture designed, implementation starting.

## License

TBD
