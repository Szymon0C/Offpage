# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Tauri 2.0 project with React frontend, SQLite database, app shell layout (sidebar, top bar, chat panel placeholder, preview area), and routing.

**Architecture:** Tauri 2.0 desktop shell (Rust) with React 19 + TypeScript + Vite frontend. SQLite via tauri-plugin-sql for local persistence. Zustand for state management. Tailwind CSS 4 for styling. React Router 7 for navigation.

**Tech Stack:** Tauri 2.0, React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, React Router 7, SQLite, tauri-plugin-sql

---

## File Structure

```
Offpage/
├── src/                              # React frontend
│   ├── main.tsx                      # Entry point, router setup
│   ├── App.tsx                       # Root component with layout
│   ├── index.css                     # Tailwind imports + global styles
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx           # Icon sidebar (48px)
│   │   │   ├── TopBar.tsx            # Project name, responsive toggle, deploy btn
│   │   │   └── AppShell.tsx          # Main layout grid: sidebar + topbar + content
│   │   └── ui/
│   │       └── IconButton.tsx        # Reusable icon button for sidebar
│   ├── pages/
│   │   ├── HomePage.tsx              # Landing/dashboard — recent projects
│   │   ├── ProjectPage.tsx           # Chat + Preview layout (placeholder)
│   │   ├── TemplatesPage.tsx         # Template gallery (placeholder)
│   │   └── SettingsPage.tsx          # Settings (placeholder)
│   ├── stores/
│   │   └── projectStore.ts           # Zustand store for projects
│   ├── db/
│   │   ├── database.ts               # SQLite connection + init
│   │   └── migrations.ts             # Schema creation queries
│   └── types/
│       └── project.ts                # TypeScript types for data model
├── src-tauri/                        # Rust backend
│   ├── src/
│   │   ├── lib.rs                    # Plugin registration, command handlers
│   │   └── main.rs                   # Entry point
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── build.rs
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── index.html
```

---

### Task 1: Scaffold Tauri 2.0 + React + TypeScript project

**Files:**
- Create: entire project scaffold via `npm create tauri-app@latest`
- Modify: `package.json` (add dependencies)
- Modify: `src-tauri/Cargo.toml` (add plugins)

- [ ] **Step 1: Create the Tauri project**

Run from the project root (which currently has only CLAUDE.md and README.md):

```bash
# Back up existing files
cp README.md /tmp/offpage-readme.md
cp CLAUDE.md /tmp/offpage-claude.md

# Create Tauri project in a temp dir, then move files
cd /tmp && npm create tauri-app@latest -- --template react-ts offpage-scaffold
# Move scaffold contents into our repo
cp -r /tmp/offpage-scaffold/* /path/to/Offpage/
cp -r /tmp/offpage-scaffold/.* /path/to/Offpage/ 2>/dev/null || true

# Restore our files
cp /tmp/offpage-readme.md /path/to/Offpage/README.md
cp /tmp/offpage-claude.md /path/to/Offpage/CLAUDE.md
```

- [ ] **Step 2: Install frontend dependencies**

```bash
npm install
npm install react-router-dom@7 zustand @tauri-apps/plugin-sql @tauri-apps/plugin-shell
npm install -D tailwindcss@4 @tailwindcss/vite
```

- [ ] **Step 3: Add Tailwind CSS 4 Vite plugin**

Modify `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  clearScreen: false,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === 'windows'
        ? 'chrome105'
        : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
```

- [ ] **Step 4: Set up Tailwind CSS 4 entry**

Replace `src/index.css` with:

```css
@import "tailwindcss";

:root {
  --color-bg-primary: #0d0d1a;
  --color-bg-secondary: #12122a;
  --color-bg-tertiary: #1a1a3a;
  --color-bg-elevated: #2a2a4a;
  --color-border: #2a2a5a;
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #888;
  --color-accent: #6c5ce7;
  --color-accent-hover: #7c6cf7;
}

body {
  margin: 0;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
  height: 100vh;
}

#root {
  height: 100vh;
}
```

- [ ] **Step 5: Add tauri-plugin-sql to Rust backend**

Modify `src-tauri/Cargo.toml` — add to `[dependencies]`:

```toml
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-shell = "2"
```

- [ ] **Step 6: Register plugins in lib.rs**

Replace `src-tauri/src/lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 7: Configure permissions**

Add to `src-tauri/capabilities/default.json` (create if needed):

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default permissions for Offpage",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-execute",
    "sql:allow-select",
    "shell:default",
    "shell:allow-spawn",
    "shell:allow-execute"
  ]
}
```

- [ ] **Step 8: Verify it builds**

```bash
npm run tauri dev
```

Expected: Tauri window opens with default React starter page. Close it.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri 2.0 + React + TypeScript project

Includes: Tailwind CSS 4, Zustand, React Router 7,
tauri-plugin-sql (SQLite), tauri-plugin-shell"
```

---

### Task 2: TypeScript types and database schema

**Files:**
- Create: `src/types/project.ts`
- Create: `src/db/migrations.ts`
- Create: `src/db/database.ts`

- [ ] **Step 1: Define TypeScript types**

Create `src/types/project.ts`:

```typescript
export interface Project {
  id: string;
  name: string;
  html: string;
  template_id: string | null;
  site_type: SiteType;
  deploy_config: DeployConfig | null;
  created_at: string;
  updated_at: string;
}

export type SiteType = 'landing' | 'portfolio' | 'blog' | 'ecommerce';

export interface DeployConfig {
  provider: 'netlify' | 'vercel' | 'github-pages';
  site_id: string;
  url: string;
}

export interface Snapshot {
  id: string;
  project_id: string;
  html: string;
  description: string;
  version: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  edit_type: 'chat' | 'inline' | 'wysiwyg' | null;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  category: SiteType;
  html: string;
  thumbnail: Uint8Array | null;
  version: string;
}

export interface Settings {
  key: string;
  value: unknown;
}
```

- [ ] **Step 2: Create migration queries**

Create `src/db/migrations.ts`:

```typescript
export const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    html TEXT NOT NULL DEFAULT '',
    template_id TEXT,
    site_type TEXT NOT NULL DEFAULT 'landing',
    deploy_config TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    html TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    edit_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    html TEXT NOT NULL,
    thumbnail BLOB,
    version TEXT NOT NULL DEFAULT '1.0.0'
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '{}'
  )`,
];
```

- [ ] **Step 3: Create database connection module**

Create `src/db/database.ts`:

```typescript
import Database from '@tauri-apps/plugin-sql';
import { MIGRATIONS } from './migrations';

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) return db;
  db = await Database.load('sqlite:offpage.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: Database): Promise<void> {
  for (const migration of MIGRATIONS) {
    await database.execute(migration);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/project.ts src/db/migrations.ts src/db/database.ts
git commit -m "feat: add TypeScript types and SQLite schema migrations"
```

---

### Task 3: Zustand project store

**Files:**
- Create: `src/stores/projectStore.ts`

- [ ] **Step 1: Create the project store**

Create `src/stores/projectStore.ts`:

```typescript
import { create } from 'zustand';
import { getDatabase } from '../db/database';
import type { Project, SiteType } from '../types/project';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  loadProjects: () => Promise<void>;
  createProject: (name: string, siteType: SiteType) => Promise<Project>;
  setCurrentProject: (project: Project | null) => void;
  updateProjectHtml: (id: string, html: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    const db = await getDatabase();
    const projects = await db.select<Project[]>(
      'SELECT * FROM projects ORDER BY updated_at DESC'
    );
    set({ projects, loading: false });
  },

  createProject: async (name: string, siteType: SiteType) => {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO projects (id, name, site_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, siteType, now, now]
    );
    const project: Project = {
      id,
      name,
      html: '',
      template_id: null,
      site_type: siteType,
      deploy_config: null,
      created_at: now,
      updated_at: now,
    };
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  updateProjectHtml: async (id: string, html: string) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.execute(
      'UPDATE projects SET html = ?, updated_at = ? WHERE id = ?',
      [html, now, id]
    );
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, html, updated_at: now } : p
      ),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, html, updated_at: now }
          : state.currentProject,
    }));
  },

  deleteProject: async (id: string) => {
    const db = await getDatabase();
    await db.execute('DELETE FROM projects WHERE id = ?', [id]);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject:
        state.currentProject?.id === id ? null : state.currentProject,
    }));
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/projectStore.ts
git commit -m "feat: add Zustand project store with SQLite persistence"
```

---

### Task 4: App shell layout — Sidebar

**Files:**
- Create: `src/components/ui/IconButton.tsx`
- Create: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create IconButton component**

Create `src/components/ui/IconButton.tsx`:

```typescript
interface IconButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function IconButton({ icon, label, active, onClick }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors cursor-pointer ${
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)] hover:text-white'
      }`}
    >
      {icon}
    </button>
  );
}
```

- [ ] **Step 2: Create Sidebar component**

Create `src/components/layout/Sidebar.tsx`:

```typescript
import { useLocation, useNavigate } from 'react-router-dom';
import { IconButton } from '../ui/IconButton';

const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/templates', icon: '🎨', label: 'Templates' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
] as const;

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="w-12 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col items-center pt-3 gap-3">
      {NAV_ITEMS.map((item) => (
        <IconButton
          key={item.path}
          icon={item.icon}
          label={item.label}
          active={
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
          }
          onClick={() => navigate(item.path)}
        />
      ))}
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/IconButton.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add Sidebar with icon navigation"
```

---

### Task 5: App shell layout — TopBar and AppShell

**Files:**
- Create: `src/components/layout/TopBar.tsx`
- Create: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Create TopBar component**

Create `src/components/layout/TopBar.tsx`:

```typescript
import { useProjectStore } from '../../stores/projectStore';

export function TopBar() {
  const currentProject = useProjectStore((s) => s.currentProject);

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
            <button className="bg-[var(--color-bg-elevated)] px-2.5 py-1 rounded-md text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors">
              📱 Mobile
            </button>
            <button className="bg-[var(--color-accent)] px-2.5 py-1 rounded-md text-xs text-white hover:bg-[var(--color-accent-hover)] transition-colors">
              🚀 Deploy
            </button>
          </>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create AppShell component**

Create `src/components/layout/AppShell.tsx`:

```typescript
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <div className="h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopBar.tsx src/components/layout/AppShell.tsx
git commit -m "feat: add TopBar and AppShell layout components"
```

---

### Task 6: Pages (placeholders) and routing

**Files:**
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/ProjectPage.tsx`
- Create: `src/pages/TemplatesPage.tsx`
- Create: `src/pages/SettingsPage.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create HomePage**

Create `src/pages/HomePage.tsx`:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';

export function HomePage() {
  const { projects, loading, loadProjects, createProject, setCurrentProject } =
    useProjectStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleNewProject = async () => {
    const project = await createProject('Untitled Site', 'landing');
    setCurrentProject(project);
    navigate(`/project/${project.id}`);
  };

  const handleOpenProject = (project: (typeof projects)[0]) => {
    setCurrentProject(project);
    navigate(`/project/${project.id}`);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-2">Welcome to Offpage</h1>
      <p className="text-[var(--color-text-secondary)] mb-8">
        Generate websites with AI — entirely on your device.
      </p>

      <button
        onClick={handleNewProject}
        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors mb-8"
      >
        + New Project
      </button>

      {loading && (
        <p className="text-[var(--color-text-secondary)] text-sm">Loading...</p>
      )}

      {!loading && projects.length > 0 && (
        <div className="w-full max-w-lg">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
            Recent Projects
          </h2>
          <div className="flex flex-col gap-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleOpenProject(project)}
                className="bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg p-3 text-left transition-colors"
              >
                <div className="text-sm font-medium">{project.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {project.site_type} · {new Date(project.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ProjectPage placeholder**

Create `src/pages/ProjectPage.tsx`:

```typescript
import { useProjectStore } from '../stores/projectStore';

export function ProjectPage() {
  const currentProject = useProjectStore((s) => s.currentProject);

  return (
    <div className="h-full flex">
      {/* Chat panel — placeholder */}
      <div className="w-[300px] bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border)] flex flex-col">
        <div className="p-3 border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
          AI Chat
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
          Chat coming in Phase 2
        </div>
        <div className="p-2 border-t border-[var(--color-border)]">
          <div className="bg-[var(--color-bg-elevated)] p-2 rounded-lg text-xs text-[var(--color-text-secondary)]">
            Describe what you want...
          </div>
        </div>
      </div>

      {/* Preview area — placeholder */}
      <div className="flex-1 flex flex-col">
        <div className="p-2 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex justify-between">
          <span>Live Preview</span>
          <span>1280 × 720</span>
        </div>
        <div className="flex-1 bg-white flex items-center justify-center">
          <p className="text-gray-400 text-sm">
            {currentProject
              ? 'Preview coming in Phase 3'
              : 'No project selected'}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create TemplatesPage placeholder**

Create `src/pages/TemplatesPage.tsx`:

```typescript
export function TemplatesPage() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-[var(--color-text-secondary)] text-sm">
        Templates coming in Phase 4
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create SettingsPage placeholder**

Create `src/pages/SettingsPage.tsx`:

```typescript
export function SettingsPage() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-[var(--color-text-secondary)] text-sm">
        Settings coming soon
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Set up routing in main.tsx**

Replace `src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 6: Set up routes in App.tsx**

Replace `src/App.tsx`:

```typescript
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { ProjectPage } from './pages/ProjectPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 7: Clean up unused starter files**

Delete default Tauri starter files that are no longer needed:

```bash
rm -f src/App.css src/assets/react.svg src-tauri/icons/*.png 2>/dev/null || true
```

- [ ] **Step 8: Verify the app runs**

```bash
npm run tauri dev
```

Expected: Tauri window opens with dark UI, sidebar on left (Home/Templates/Settings icons), top bar with "◈ Offpage" title, and the HomePage with "Welcome to Offpage" + "New Project" button. Clicking sidebar icons navigates between pages. Clicking "New Project" creates a project in SQLite and navigates to the ProjectPage with chat placeholder on left and white preview area on right.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add pages, routing, and complete app shell layout

HomePage with project list, ProjectPage with chat/preview placeholders,
TemplatesPage and SettingsPage placeholders. React Router 7 navigation."
```

---

### Task 7: Configure Tauri window settings

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Update Tauri window configuration**

In `src-tauri/tauri.conf.json`, update the `app.windows` section (the rest of the config stays as scaffolded):

```json
{
  "app": {
    "windows": [
      {
        "title": "Offpage",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "center": true,
        "decorations": true
      }
    ]
  }
}
```

- [ ] **Step 2: Verify window launches correctly**

```bash
npm run tauri dev
```

Expected: Window opens at 1280x800, centered on screen, with minimum resize of 900x600.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: configure Tauri window size and constraints"
```

---

### Task 8: Add .gitignore entries

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Ensure .gitignore covers all necessary entries**

Append to `.gitignore` (the Tauri scaffold creates a basic one, add these if missing):

```
# Superpowers brainstorming
.superpowers/

# Database
*.db
*.db-journal

# OS files
.DS_Store
Thumbs.db
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add gitignore entries for db files and superpowers"
```

---

## Phase Summary

After completing all tasks, you will have:
- Tauri 2.0 desktop app with React 19 + TypeScript + Vite
- Dark-themed UI with icon sidebar, top bar, and content area
- Four routes: Home, Project, Templates, Settings
- SQLite database with full schema (projects, snapshots, chat_messages, templates, settings)
- Zustand store for project CRUD with SQLite persistence
- Working "New Project" flow: click button → creates project in DB → navigates to project page
- Tailwind CSS 4 styling with design system CSS variables
- Ready for Phase 2 (AI sidecar + chat panel)
