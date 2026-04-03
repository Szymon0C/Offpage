# Phase 4: Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a template gallery where users browse bundled HTML templates by category, preview them, and create new projects from templates — optionally with AI customization.

**Architecture:** Templates are stored as HTML strings in SQLite (seeded on first launch). The TemplatesPage displays a grid of template cards with category filtering. Selecting a template creates a new project pre-populated with the template HTML. Users can optionally provide a customization prompt that sends the template + prompt to AI for modification before saving.

**Tech Stack:** React 19, TypeScript, Zustand, SQLite (tauri-plugin-sql), Tailwind CSS 4

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/stores/templateStore.ts` | Zustand store: load templates from DB, filter by category |
| `src/lib/bundledTemplates.ts` | Bundled template HTML strings + metadata for seeding DB |
| `src/components/templates/TemplateCard.tsx` | Card component showing template name, category, preview thumbnail |
| `src/components/templates/TemplatePreviewModal.tsx` | Modal with full-size template preview + "Use Template" action |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/TemplatesPage.tsx` | Replace placeholder with template gallery grid + category filter |
| `src/pages/HomePage.tsx` | Add "From Template" button alongside "New Project" |
| `src/db/database.ts` | Add template seeding on first launch |

---

### Task 1: Bundled Templates

**Files:**
- Create: `src/lib/bundledTemplates.ts`

Four templates — one per category. Each is a complete single-file HTML page.

- [ ] **Step 1: Create bundled templates file**

```typescript
// src/lib/bundledTemplates.ts

export interface BundledTemplate {
  id: string;
  name: string;
  category: 'landing' | 'portfolio' | 'blog' | 'ecommerce';
  version: string;
  html: string;
}

export const BUNDLED_TEMPLATES: BundledTemplate[] = [
  {
    id: 'tpl-landing-startup',
    name: 'Startup Landing',
    category: 'landing',
    version: '1.0.0',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Startup Name</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a2e;line-height:1.6}
header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:80px 20px;text-align:center}
header h1{font-size:3rem;margin-bottom:16px;font-weight:800}
header p{font-size:1.25rem;opacity:0.9;max-width:600px;margin:0 auto 32px}
header a{display:inline-block;background:#fff;color:#667eea;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:1.1rem;transition:transform 0.2s}
header a:hover{transform:translateY(-2px)}
section{padding:80px 20px;max-width:1000px;margin:0 auto}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:32px}
.feature{background:#f8f9ff;padding:32px;border-radius:12px}
.feature h3{font-size:1.25rem;margin-bottom:8px;color:#667eea}
.feature p{color:#555;font-size:0.95rem}
footer{background:#1a1a2e;color:#aaa;text-align:center;padding:40px 20px;font-size:0.9rem}
</style>
</head>
<body>
<header>
<h1>Build Something Amazing</h1>
<p>The fastest way to launch your next big idea. Simple, powerful, and designed for teams that move fast.</p>
<a href="#features">Get Started Free</a>
</header>
<section id="features">
<h2 style="text-align:center;font-size:2rem;margin-bottom:48px">Why Choose Us</h2>
<div class="features">
<div class="feature"><h3>Lightning Fast</h3><p>Optimized for speed from the ground up. Your users will notice the difference immediately.</p></div>
<div class="feature"><h3>Easy to Use</h3><p>No technical knowledge required. Get up and running in minutes, not hours.</p></div>
<div class="feature"><h3>Secure by Default</h3><p>Enterprise-grade security built in. Your data is encrypted and protected at every level.</p></div>
</div>
</section>
<footer>&copy; 2026 Startup Name. All rights reserved.</footer>
</body>
</html>`,
  },
  {
    id: 'tpl-portfolio-minimal',
    name: 'Minimal Portfolio',
    category: 'portfolio',
    version: '1.0.0',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Portfolio</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;color:#222;background:#fafafa}
header{padding:60px 20px;max-width:800px;margin:0 auto}
header h1{font-size:2.5rem;font-weight:800;margin-bottom:8px}
header p{color:#666;font-size:1.1rem}
nav{display:flex;gap:24px;margin-top:24px}
nav a{color:#222;text-decoration:none;font-weight:500;border-bottom:2px solid transparent;padding-bottom:4px;transition:border-color 0.2s}
nav a:hover{border-color:#222}
section{padding:40px 20px;max-width:800px;margin:0 auto}
.projects{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;margin-top:24px}
.project{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.project-img{height:200px;background:#e8e8e8;display:flex;align-items:center;justify-content:center;color:#999;font-size:0.9rem}
.project-info{padding:20px}
.project-info h3{font-size:1.1rem;margin-bottom:4px}
.project-info p{color:#888;font-size:0.85rem}
footer{padding:60px 20px;max-width:800px;margin:0 auto;color:#999;font-size:0.85rem;border-top:1px solid #eee}
</style>
</head>
<body>
<header>
<h1>Jane Designer</h1>
<p>Product designer crafting thoughtful digital experiences.</p>
<nav><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
</header>
<section id="work">
<h2 style="font-size:1.5rem">Selected Work</h2>
<div class="projects">
<div class="project"><div class="project-img">Project Image</div><div class="project-info"><h3>Brand Redesign</h3><p>Visual identity &middot; 2026</p></div></div>
<div class="project"><div class="project-img">Project Image</div><div class="project-info"><h3>Mobile App</h3><p>UI/UX Design &middot; 2025</p></div></div>
<div class="project"><div class="project-img">Project Image</div><div class="project-info"><h3>E-commerce Platform</h3><p>Web Design &middot; 2025</p></div></div>
</div>
</section>
<footer>&copy; 2026 Jane Designer</footer>
</body>
</html>`,
  },
  {
    id: 'tpl-blog-clean',
    name: 'Clean Blog',
    category: 'blog',
    version: '1.0.0',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Blog</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;color:#333;background:#fff;line-height:1.8}
header{padding:48px 20px;max-width:680px;margin:0 auto;border-bottom:1px solid #eee}
header h1{font-size:2rem;font-weight:700;margin-bottom:4px}
header p{color:#888;font-size:0.95rem}
main{max-width:680px;margin:0 auto;padding:40px 20px}
article{margin-bottom:48px;padding-bottom:48px;border-bottom:1px solid #f0f0f0}
article:last-child{border-bottom:none}
article h2{font-size:1.5rem;margin-bottom:8px}
article h2 a{color:#333;text-decoration:none}
article h2 a:hover{color:#667eea}
.meta{color:#999;font-size:0.85rem;margin-bottom:16px;font-family:system-ui,sans-serif}
article p{color:#555}
footer{max-width:680px;margin:0 auto;padding:40px 20px;color:#bbb;font-size:0.8rem;font-family:system-ui,sans-serif;border-top:1px solid #eee}
</style>
</head>
<body>
<header>
<h1>Thoughts & Words</h1>
<p>A personal blog about design, technology, and life.</p>
</header>
<main>
<article><h2><a href="#">The Art of Simplicity</a></h2><div class="meta">March 15, 2026 &middot; 5 min read</div><p>Simplicity is the ultimate sophistication. In a world overwhelmed by complexity, the ability to distill ideas to their essence is more valuable than ever. This post explores how minimalism in design leads to better user experiences.</p></article>
<article><h2><a href="#">Building for the Future</a></h2><div class="meta">March 8, 2026 &middot; 8 min read</div><p>Technology moves fast, but good design principles remain constant. Here are the timeless patterns I keep coming back to when building products that need to last.</p></article>
<article><h2><a href="#">Morning Routines That Work</a></h2><div class="meta">February 28, 2026 &middot; 4 min read</div><p>After years of experimentation, I've found a morning routine that actually sticks. It's simpler than you'd think and doesn't require waking up at 5 AM.</p></article>
</main>
<footer>&copy; 2026 Thoughts & Words</footer>
</body>
</html>`,
  },
  {
    id: 'tpl-ecommerce-store',
    name: 'Product Store',
    category: 'ecommerce',
    version: '1.0.0',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Store</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#fff}
header{display:flex;justify-content:space-between;align-items:center;padding:16px 32px;border-bottom:1px solid #eee}
header h1{font-size:1.4rem;font-weight:800}
header nav{display:flex;gap:24px}
header nav a{color:#555;text-decoration:none;font-size:0.9rem}
header nav a:hover{color:#1a1a1a}
.hero{background:#f5f5f5;padding:80px 32px;text-align:center}
.hero h2{font-size:2.5rem;font-weight:800;margin-bottom:12px}
.hero p{color:#666;font-size:1.1rem;margin-bottom:32px}
.hero a{display:inline-block;background:#1a1a1a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;transition:background 0.2s}
.hero a:hover{background:#333}
.products{max-width:1100px;margin:0 auto;padding:60px 20px}
.products h2{text-align:center;font-size:1.8rem;margin-bottom:40px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px}
.product{border:1px solid #eee;border-radius:12px;overflow:hidden;transition:box-shadow 0.2s}
.product:hover{box-shadow:0 4px 16px rgba(0,0,0,0.08)}
.product-img{height:220px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:0.85rem}
.product-info{padding:16px}
.product-info h3{font-size:1rem;margin-bottom:4px}
.product-info .price{font-weight:700;color:#1a1a1a;font-size:1.1rem}
.product-info .old-price{text-decoration:line-through;color:#999;font-size:0.85rem;margin-left:8px}
footer{background:#1a1a1a;color:#999;padding:40px 32px;text-align:center;font-size:0.85rem;margin-top:60px}
</style>
</head>
<body>
<header><h1>STORE</h1><nav><a href="#">Shop</a><a href="#">Collections</a><a href="#">About</a><a href="#">Cart (0)</a></nav></header>
<section class="hero">
<h2>New Season Arrivals</h2>
<p>Discover our latest collection of premium products.</p>
<a href="#products">Shop Now</a>
</section>
<section class="products" id="products">
<h2>Featured Products</h2>
<div class="grid">
<div class="product"><div class="product-img">Product Image</div><div class="product-info"><h3>Classic White Tee</h3><p><span class="price">$49</span></p></div></div>
<div class="product"><div class="product-img">Product Image</div><div class="product-info"><h3>Leather Backpack</h3><p><span class="price">$129</span><span class="old-price">$159</span></p></div></div>
<div class="product"><div class="product-img">Product Image</div><div class="product-info"><h3>Minimalist Watch</h3><p><span class="price">$199</span></p></div></div>
<div class="product"><div class="product-img">Product Image</div><div class="product-info"><h3>Canvas Sneakers</h3><p><span class="price">$89</span></p></div></div>
</div>
</section>
<footer>&copy; 2026 STORE. All rights reserved.</footer>
</body>
</html>`,
  },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/bundledTemplates.ts
git commit -m "feat: add bundled HTML templates for all four categories"
```

---

### Task 2: Template Store

**Files:**
- Create: `src/stores/templateStore.ts`

- [ ] **Step 1: Create the template store**

```typescript
// src/stores/templateStore.ts
import { create } from 'zustand';
import { getDatabase } from '../db/database';
import type { SiteType } from '../types/project';

export interface Template {
  id: string;
  name: string;
  category: SiteType;
  html: string;
  version: string;
}

interface TemplateState {
  templates: Template[];
  filter: SiteType | 'all';
  loading: boolean;
  loadTemplates: () => Promise<void>;
  setFilter: (filter: SiteType | 'all') => void;
  filteredTemplates: () => Template[];
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  filter: 'all',
  loading: false,

  loadTemplates: async () => {
    set({ loading: true });
    try {
      const db = await getDatabase();
      const templates = await db.select<Template[]>(
        'SELECT id, name, category, html, version FROM templates ORDER BY category, name'
      );
      set({ templates, loading: false });
    } catch (error) {
      console.error('Failed to load templates:', error);
      set({ loading: false });
    }
  },

  setFilter: (filter) => set({ filter }),

  filteredTemplates: () => {
    const { templates, filter } = get();
    if (filter === 'all') return templates;
    return templates.filter((t) => t.category === filter);
  },
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/stores/templateStore.ts
git commit -m "feat: add template store with category filtering"
```

---

### Task 3: Seed Templates on First Launch

**Files:**
- Modify: `src/db/database.ts`

Add a seeding function that inserts bundled templates if the templates table is empty.

- [ ] **Step 1: Add seed function**

After the existing `getDatabase` function, add template seeding. Import `BUNDLED_TEMPLATES` from `../lib/bundledTemplates` and call `seedTemplates(db)` inside the init function, after migrations.

The seed function:

```typescript
import { BUNDLED_TEMPLATES } from '../lib/bundledTemplates';

async function seedTemplates(db: Database): Promise<void> {
  const rows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) as count FROM templates');
  if (rows[0]?.count > 0) return;

  for (const tpl of BUNDLED_TEMPLATES) {
    await db.execute(
      'INSERT INTO templates (id, name, category, html, thumbnail, version) VALUES (?, ?, ?, ?, NULL, ?)',
      [tpl.id, tpl.name, tpl.category, tpl.html, tpl.version]
    );
  }
}
```

Call `await seedTemplates(db)` after the migration `db.execute(CREATE TABLE...)` calls complete inside the database init function.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/db/database.ts
git commit -m "feat: seed bundled templates into DB on first launch"
```

---

### Task 4: TemplateCard Component

**Files:**
- Create: `src/components/templates/TemplateCard.tsx`

- [ ] **Step 1: Create TemplateCard**

```tsx
// src/components/templates/TemplateCard.tsx
import type { SiteType } from '../../types/project';

interface TemplateCardProps {
  id: string;
  name: string;
  category: SiteType;
  html: string;
  onSelect: (id: string) => void;
}

const CATEGORY_COLORS: Record<SiteType, string> = {
  landing: 'bg-indigo-500/20 text-indigo-400',
  portfolio: 'bg-emerald-500/20 text-emerald-400',
  blog: 'bg-amber-500/20 text-amber-400',
  ecommerce: 'bg-rose-500/20 text-rose-400',
};

export function TemplateCard({ id, name, category, html, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="bg-[var(--color-bg-elevated)] rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all hover:shadow-lg text-left group"
    >
      <div className="h-48 bg-white relative overflow-hidden">
        <iframe
          srcDoc={html}
          title={name}
          sandbox=""
          className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
          tabIndex={-1}
        />
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
          {name}
        </h3>
        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category]}`}>
          {category}
        </span>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/templates/TemplateCard.tsx
git commit -m "feat: add TemplateCard with scaled iframe preview"
```

---

### Task 5: TemplatePreviewModal Component

**Files:**
- Create: `src/components/templates/TemplatePreviewModal.tsx`

Modal with full-size preview, template name, and "Use Template" / "Use with AI" buttons.

- [ ] **Step 1: Create the modal**

```tsx
// src/components/templates/TemplatePreviewModal.tsx
import { useState } from 'react';
import type { Template } from '../../stores/templateStore';

interface TemplatePreviewModalProps {
  template: Template;
  onUse: (templateId: string, customPrompt?: string) => void;
  onClose: () => void;
}

export function TemplatePreviewModal({ template, onUse, onClose }: TemplatePreviewModalProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleUseDirectly = () => {
    onUse(template.id);
  };

  const handleUseWithAi = () => {
    if (!showPrompt) {
      setShowPrompt(true);
      return;
    }
    const text = prompt.trim();
    if (text) {
      onUse(template.id, text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUseWithAi();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[var(--color-bg-secondary)] rounded-2xl shadow-2xl w-[90vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{template.name}</h2>
            <span className="text-xs text-[var(--color-text-secondary)]">{template.category}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl px-2"
          >
            &times;
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 bg-white overflow-hidden">
          <iframe
            srcDoc={template.html}
            title={template.name}
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] flex items-center gap-3">
          {showPrompt && (
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe how to customize this template..."
              className="flex-1 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)]"
              autoFocus
            />
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={handleUseDirectly}
              className="bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-sm px-4 py-2 rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors"
            >
              Use as-is
            </button>
            <button
              type="button"
              onClick={handleUseWithAi}
              disabled={showPrompt && !prompt.trim()}
              className="bg-[var(--color-accent)] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {showPrompt ? 'Apply & Create' : 'Customize with AI'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/templates/TemplatePreviewModal.tsx
git commit -m "feat: add TemplatePreviewModal with AI customization option"
```

---

### Task 6: TemplatesPage

**Files:**
- Modify: `src/pages/TemplatesPage.tsx`

Replace placeholder with full gallery: category filter tabs, template grid, preview modal, and project creation flow.

- [ ] **Step 1: Rewrite TemplatesPage**

```tsx
// src/pages/TemplatesPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplateStore } from '../stores/templateStore';
import { useProjectStore } from '../stores/projectStore';
import { TemplateCard } from '../components/templates/TemplateCard';
import { TemplatePreviewModal } from '../components/templates/TemplatePreviewModal';
import type { Template } from '../stores/templateStore';
import type { SiteType } from '../types/project';

const CATEGORIES: Array<{ value: SiteType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'landing', label: 'Landing' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'blog', label: 'Blog' },
  { value: 'ecommerce', label: 'E-commerce' },
];

export function TemplatesPage() {
  const { templates, filter, loading, loadTemplates, setFilter, filteredTemplates } =
    useTemplateStore();
  const { createProject, updateProjectHtml, setCurrentProject } = useProjectStore();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (templates.length === 0) {
      loadTemplates();
    }
  }, [templates.length, loadTemplates]);

  const handleSelectCard = (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setSelectedTemplate(tpl);
  };

  const handleUseTemplate = async (templateId: string, customPrompt?: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    const project = await createProject(tpl.name, tpl.category);
    await updateProjectHtml(project.id, tpl.html);
    setCurrentProject({ ...project, html: tpl.html });
    setSelectedTemplate(null);

    // Navigate to project — if customPrompt is provided, the user can
    // send it as the first chat message to AI-customize the template
    navigate(`/project/${project.id}${customPrompt ? `?prompt=${encodeURIComponent(customPrompt)}` : ''}`);
  };

  const displayed = filteredTemplates();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Templates</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Pick a template as your starting point, then customize with AI or edit directly.
        </p>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setFilter(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === cat.value
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        {loading ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Loading templates...</p>
        ) : displayed.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No templates found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                id={tpl.id}
                name={tpl.name}
                category={tpl.category}
                html={tpl.html}
                onSelect={handleSelectCard}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onUse={handleUseTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/pages/TemplatesPage.tsx
git commit -m "feat: replace template placeholder with full gallery page"
```

---

### Task 7: Handle Template Customization Prompt in ProjectPage

**Files:**
- Modify: `src/pages/ProjectPage.tsx`

When navigating from the template gallery with a `?prompt=` query param, automatically send it as the first chat message to AI-customize the template.

- [ ] **Step 1: Add query param handling**

Add `useSearchParams` to ProjectPage. After loading the project, check for `prompt` param and auto-send it.

```typescript
import { useSearchParams } from 'react-router-dom';
```

Inside the component, add:

```typescript
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPromptSent = useRef(false);

  // Auto-send template customization prompt
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (prompt && currentProject?.html && !initialPromptSent.current && !streaming) {
      initialPromptSent.current = true;
      setSearchParams({}, { replace: true });

      // Send the customization prompt as a chat edit
      const chatHistory: Array<{ role: string; content: string }> = [];
      generate(
        currentProject.id,
        SYSTEM_PROMPTS.editFull,
        buildEditMessages(currentProject.html, chatHistory, prompt)
      ).then((result) => {
        if (result) {
          addMessage(currentProject.id, 'user', prompt, 'chat');
          createSnapshot(currentProject.id, result, `Template customization: ${prompt.slice(0, 50)}`);
        }
      });
    }
  }, [searchParams, currentProject, streaming]);
```

Add the missing imports:

```typescript
import { SYSTEM_PROMPTS, buildEditMessages } from '../lib/prompts';
```

And get `generate` from `useAiStream`:

```typescript
  const { generate, generateSection } = useAiStream();
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProjectPage.tsx
git commit -m "feat: auto-send template customization prompt on project load"
```

---

### Task 8: Add Template Button to HomePage

**Files:**
- Modify: `src/pages/HomePage.tsx`

Add a "From Template" button next to "New Project" that navigates to `/templates`.

- [ ] **Step 1: Update HomePage**

Read the current file first, then add a "From Template" button next to the existing "New Project" button. Use `useNavigate` from react-router-dom.

Add after the "New Project" button:

```tsx
<button
  type="button"
  onClick={() => navigate('/templates')}
  className="bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] px-4 py-2 rounded-lg text-sm hover:bg-[var(--color-bg-primary)] transition-colors border border-[var(--color-border)]"
>
  From Template
</button>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: add 'From Template' button to HomePage"
```

---

### Task 9: Final Verification

- [ ] **Step 1: TypeScript compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 2: Vite build**

Run: `npm run build`

- [ ] **Step 3: Commit any fixes**

If any issues, fix and commit.
