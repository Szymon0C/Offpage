# Phase 3: Preview & Editing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable interactive preview with responsive viewport toggle, inline section editing via AI prompts, and direct WYSIWYG text editing — all communicating through a postMessage bridge between the app and an isolated preview iframe.

**Architecture:** The preview iframe loads user HTML with an injected helper script that detects semantic sections, handles click/hover events, and communicates with the parent app via postMessage. The parent maintains an `editorStore` that tracks edit mode (view/inline/wysiwyg), selected section, and viewport size. Inline edits send section HTML to AI for modification; WYSIWYG edits use contentEditable directly and sync changes back via postMessage.

**Tech Stack:** React 19, TypeScript, Zustand, Tauri IPC, postMessage API, contentEditable

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/stores/editorStore.ts` | Editor state: edit mode, selected section, viewport, section list |
| `src/lib/iframeBridge.ts` | postMessage protocol types, send/receive helpers, helper script injection |
| `src/lib/helperScript.ts` | Raw JS string injected into iframe — section detection, hover overlays, click handling, WYSIWYG mode, postMessage sender |
| `src/lib/htmlSections.ts` | Parse full HTML to extract/replace sections by data-offpage-id |
| `src/components/preview/PreviewFrame.tsx` | iframe wrapper: injects HTML+helper script, listens for postMessage, responsive viewport sizing |
| `src/components/preview/PreviewToolbar.tsx` | Viewport toggle (desktop/tablet/mobile), edit mode toggle buttons |
| `src/components/preview/InlineEditBar.tsx` | Floating prompt bar shown when a section is selected in inline mode |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/ProjectPage.tsx` | Replace raw iframe with PreviewFrame, add PreviewToolbar, wire InlineEditBar |
| `src/components/chat/ChatPanel.tsx` | Handle inline edit submissions (section prompt → AI → replace section) |
| `src/hooks/useAiStream.ts` | Add `generateSection` method for inline section edits |
| `src/components/layout/TopBar.tsx` | Wire responsive viewport toggle and edit mode buttons |

---

### Task 1: Editor Store

**Files:**
- Create: `src/stores/editorStore.ts`

- [ ] **Step 1: Create the editor store**

```typescript
// src/stores/editorStore.ts
import { create } from 'zustand';

export type EditMode = 'view' | 'inline' | 'wysiwyg';
export type ViewportSize = 'desktop' | 'tablet' | 'mobile';

export interface SelectedSection {
  id: string;
  tagName: string;
  outerHtml: string;
}

interface EditorState {
  editMode: EditMode;
  viewport: ViewportSize;
  selectedSection: SelectedSection | null;
  setEditMode: (mode: EditMode) => void;
  setViewport: (size: ViewportSize) => void;
  selectSection: (section: SelectedSection | null) => void;
  clearSelection: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  editMode: 'view',
  viewport: 'desktop',
  selectedSection: null,

  setEditMode: (mode) => set({ editMode: mode, selectedSection: null }),
  setViewport: (size) => set({ viewport: size }),
  selectSection: (section) => set({ selectedSection: section }),
  clearSelection: () => set({ selectedSection: null }),
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/stores/editorStore.ts
git commit -m "feat: add editor store for edit mode, viewport, and section selection"
```

---

### Task 2: Helper Script (injected into iframe)

**Files:**
- Create: `src/lib/helperScript.ts`

This is the JavaScript that runs inside the preview iframe. It detects semantic sections, adds hover overlays, handles clicks, enables WYSIWYG contentEditable, and communicates with the parent via postMessage.

- [ ] **Step 1: Create the helper script**

```typescript
// src/lib/helperScript.ts

/**
 * Returns a string of JavaScript to be injected into the preview iframe.
 * This script runs in the iframe's context — it has NO access to React or app code.
 * Communication is exclusively via window.parent.postMessage.
 */
export function getHelperScript(): string {
  return `
(function() {
  const SEMANTIC_TAGS = ['HEADER', 'SECTION', 'FOOTER', 'MAIN', 'NAV', 'ARTICLE'];
  let currentMode = 'view'; // 'view' | 'inline' | 'wysiwyg'
  let hoveredEl = null;
  let selectedEl = null;
  let overlay = null;

  // --- Section Detection ---
  function detectSections() {
    const sections = [];
    const candidates = Array.from(document.body.children);
    candidates.forEach((el, i) => {
      if (el.nodeType !== 1) return;
      if (el.id === '__offpage-overlay') return;
      const tag = el.tagName;
      const isSemantic = SEMANTIC_TAGS.includes(tag);
      const hasContent = el.textContent && el.textContent.trim().length > 20;
      if (isSemantic || hasContent) {
        const id = el.getAttribute('data-offpage-id') || 'section-' + i;
        el.setAttribute('data-offpage-id', id);
        sections.push({ id: id, tagName: tag, outerHtml: el.outerHTML });
      }
    });
    return sections;
  }

  // --- Overlay ---
  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = '__offpage-overlay';
    overlay.style.cssText = 'position:absolute;pointer-events:none;border:2px solid #6366f1;border-radius:4px;transition:all 0.15s ease;display:none;z-index:99999;';
    document.body.appendChild(overlay);
  }

  function positionOverlay(el) {
    if (!overlay || !el) return;
    const rect = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = (rect.top + window.scrollY) + 'px';
    overlay.style.left = (rect.left + window.scrollX) + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
  }

  // --- Event Handlers ---
  function onMouseOver(e) {
    if (currentMode === 'view') return;
    const section = findParentSection(e.target);
    if (section && section !== hoveredEl) {
      hoveredEl = section;
      positionOverlay(section);
      overlay.style.borderColor = currentMode === 'wysiwyg' ? '#f59e0b' : '#6366f1';
    }
  }

  function onMouseOut(e) {
    if (currentMode === 'view') return;
    const section = findParentSection(e.relatedTarget);
    if (!section || section !== hoveredEl) {
      hoveredEl = null;
      if (!selectedEl) hideOverlay();
    }
  }

  function onClick(e) {
    if (currentMode === 'view') return;
    e.preventDefault();
    e.stopPropagation();
    const section = findParentSection(e.target);
    if (!section) return;

    selectedEl = section;
    positionOverlay(section);

    if (currentMode === 'inline') {
      overlay.style.borderColor = '#6366f1';
      overlay.style.backgroundColor = 'rgba(99,102,241,0.05)';
      window.parent.postMessage({
        type: 'offpage:section-selected',
        payload: {
          id: section.getAttribute('data-offpage-id'),
          tagName: section.tagName,
          outerHtml: section.outerHTML
        }
      }, '*');
    } else if (currentMode === 'wysiwyg') {
      overlay.style.borderColor = '#f59e0b';
      overlay.style.backgroundColor = 'rgba(245,158,11,0.05)';
      enableContentEditable(section);
    }
  }

  // --- WYSIWYG ---
  function enableContentEditable(section) {
    // Disable previous
    if (selectedEl && selectedEl !== section) {
      disableContentEditable(selectedEl);
    }
    section.contentEditable = 'true';
    section.focus();
    section.addEventListener('input', onContentEdit);
    section.addEventListener('blur', onContentBlur);
  }

  function disableContentEditable(section) {
    section.contentEditable = 'false';
    section.removeEventListener('input', onContentEdit);
    section.removeEventListener('blur', onContentBlur);
  }

  let editDebounce = null;
  function onContentEdit(e) {
    clearTimeout(editDebounce);
    editDebounce = setTimeout(() => {
      const section = e.target;
      window.parent.postMessage({
        type: 'offpage:wysiwyg-edit',
        payload: {
          id: section.getAttribute('data-offpage-id'),
          outerHtml: section.outerHTML
        }
      }, '*');
    }, 300);
  }

  function onContentBlur(e) {
    const section = e.target;
    disableContentEditable(section);
    window.parent.postMessage({
      type: 'offpage:wysiwyg-done',
      payload: {
        id: section.getAttribute('data-offpage-id'),
        outerHtml: section.outerHTML
      }
    }, '*');
    selectedEl = null;
    hideOverlay();
  }

  // --- Helpers ---
  function findParentSection(el) {
    while (el && el !== document.body) {
      if (el.hasAttribute && el.hasAttribute('data-offpage-id')) return el;
      el = el.parentElement;
    }
    return null;
  }

  // --- Message Handler (from parent) ---
  window.addEventListener('message', (e) => {
    if (!e.data || !e.data.type) return;
    switch (e.data.type) {
      case 'offpage:set-mode':
        currentMode = e.data.payload.mode;
        if (currentMode === 'view') {
          if (selectedEl) disableContentEditable(selectedEl);
          selectedEl = null;
          hoveredEl = null;
          hideOverlay();
        }
        break;
      case 'offpage:replace-section': {
        const { id, newHtml } = e.data.payload;
        const el = document.querySelector('[data-offpage-id="' + id + '"]');
        if (el) {
          const temp = document.createElement('div');
          temp.innerHTML = newHtml;
          const newEl = temp.firstElementChild;
          if (newEl) {
            newEl.setAttribute('data-offpage-id', id);
            el.replaceWith(newEl);
          }
        }
        selectedEl = null;
        hideOverlay();
        break;
      }
      case 'offpage:get-full-html':
        window.parent.postMessage({
          type: 'offpage:full-html',
          payload: { html: document.documentElement.outerHTML }
        }, '*');
        break;
      case 'offpage:get-sections':
        window.parent.postMessage({
          type: 'offpage:sections-list',
          payload: { sections: detectSections() }
        }, '*');
        break;
    }
  });

  // --- Init ---
  createOverlay();
  document.body.addEventListener('mouseover', onMouseOver);
  document.body.addEventListener('mouseout', onMouseOut);
  document.body.addEventListener('click', onClick, true);

  // Notify parent that helper is ready
  detectSections();
  window.parent.postMessage({ type: 'offpage:ready' }, '*');
})();
`;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/helperScript.ts
git commit -m "feat: add iframe helper script for section detection and edit overlays"
```

---

### Task 3: iframe Bridge (postMessage protocol)

**Files:**
- Create: `src/lib/iframeBridge.ts`

This module defines the typed postMessage protocol and provides helpers for communicating with the iframe.

- [ ] **Step 1: Create the iframe bridge**

```typescript
// src/lib/iframeBridge.ts
import { getHelperScript } from './helperScript';
import type { EditMode } from '../stores/editorStore';

// Messages FROM iframe TO parent
export type IframeToParentMessage =
  | { type: 'offpage:ready' }
  | { type: 'offpage:section-selected'; payload: { id: string; tagName: string; outerHtml: string } }
  | { type: 'offpage:wysiwyg-edit'; payload: { id: string; outerHtml: string } }
  | { type: 'offpage:wysiwyg-done'; payload: { id: string; outerHtml: string } }
  | { type: 'offpage:full-html'; payload: { html: string } }
  | { type: 'offpage:sections-list'; payload: { sections: Array<{ id: string; tagName: string; outerHtml: string }> } };

// Messages FROM parent TO iframe
export type ParentToIframeMessage =
  | { type: 'offpage:set-mode'; payload: { mode: EditMode } }
  | { type: 'offpage:replace-section'; payload: { id: string; newHtml: string } }
  | { type: 'offpage:get-full-html' }
  | { type: 'offpage:get-sections' };

/**
 * Send a message to the iframe's contentWindow.
 */
export function sendToIframe(iframe: HTMLIFrameElement, message: ParentToIframeMessage): void {
  iframe.contentWindow?.postMessage(message, '*');
}

/**
 * Inject the helper script into HTML before the closing </body> tag.
 * If no </body> is found, appends to the end.
 */
export function injectHelperScript(html: string): string {
  const script = `<script id="__offpage-helper">${getHelperScript()}<\/script>`;
  const bodyCloseIndex = html.lastIndexOf('</body>');
  if (bodyCloseIndex !== -1) {
    return html.slice(0, bodyCloseIndex) + script + html.slice(bodyCloseIndex);
  }
  return html + script;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/iframeBridge.ts
git commit -m "feat: add iframe bridge with typed postMessage protocol"
```

---

### Task 4: HTML Section Parser

**Files:**
- Create: `src/lib/htmlSections.ts`

Utility to extract a section from full HTML by `data-offpage-id` and replace it. Uses string manipulation (regex) instead of DOM to work on raw HTML strings stored in the database.

- [ ] **Step 1: Create the section parser**

```typescript
// src/lib/htmlSections.ts

/**
 * Replace a section in full HTML identified by data-offpage-id.
 * Uses regex to find the element with the matching attribute and replaces its outerHTML.
 *
 * @param fullHtml - The complete page HTML
 * @param sectionId - The data-offpage-id value to find
 * @param newSectionHtml - The replacement HTML for that section
 * @returns Updated full HTML, or original if section not found
 */
export function replaceSectionInHtml(
  fullHtml: string,
  sectionId: string,
  newSectionHtml: string
): string {
  // Match the opening tag with data-offpage-id="sectionId"
  const escapedId = sectionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const openTagRegex = new RegExp(
    `(<(\\w+)[^>]*data-offpage-id\\s*=\\s*"${escapedId}"[^>]*>)`,
    's'
  );
  const match = openTagRegex.exec(fullHtml);
  if (!match) return fullHtml;

  const tagName = match[2];
  const startIndex = match.index;

  // Find the matching closing tag
  // Simple approach: find the corresponding closing tag by counting nesting
  let depth = 1;
  let searchFrom = startIndex + match[0].length;
  const openPattern = new RegExp(`<${tagName}[\\s>]`, 'gi');
  const closePattern = new RegExp(`</${tagName}>`, 'gi');

  openPattern.lastIndex = searchFrom;
  closePattern.lastIndex = searchFrom;

  while (depth > 0) {
    const nextOpen = openPattern.exec(fullHtml);
    const nextClose = closePattern.exec(fullHtml);

    if (!nextClose) break; // malformed HTML, bail

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      openPattern.lastIndex = nextOpen.index + nextOpen[0].length;
      closePattern.lastIndex = nextClose.index; // re-check this close
    } else {
      depth--;
      if (depth === 0) {
        const endIndex = nextClose.index + nextClose[0].length;
        return fullHtml.slice(0, startIndex) + newSectionHtml + fullHtml.slice(endIndex);
      }
    }
  }

  return fullHtml;
}

/**
 * Ensure the replacement HTML has the correct data-offpage-id attribute.
 */
export function ensureSectionId(sectionHtml: string, sectionId: string): string {
  // Check if data-offpage-id already present
  if (sectionHtml.includes(`data-offpage-id="${sectionId}"`)) {
    return sectionHtml;
  }
  // Add to first opening tag
  return sectionHtml.replace(/^(<\w+)/, `$1 data-offpage-id="${sectionId}"`);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/htmlSections.ts
git commit -m "feat: add HTML section parser for extract/replace by data-offpage-id"
```

---

### Task 5: PreviewFrame Component

**Files:**
- Create: `src/components/preview/PreviewFrame.tsx`

The iframe wrapper that injects HTML with the helper script, listens for postMessage events, and dispatches to the editor store.

- [ ] **Step 1: Create the PreviewFrame component**

```tsx
// src/components/preview/PreviewFrame.tsx
import { useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useEditorStore } from '../../stores/editorStore';
import { injectHelperScript, sendToIframe } from '../../lib/iframeBridge';
import { replaceSectionInHtml, ensureSectionId } from '../../lib/htmlSections';
import type { IframeToParentMessage } from '../../lib/iframeBridge';

const VIEWPORT_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
} as const;

export function PreviewFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateProjectHtml = useProjectStore((s) => s.updateProjectHtml);
  const { editMode, viewport, selectSection } = useEditorStore();

  // Send edit mode changes to iframe
  useEffect(() => {
    if (iframeRef.current) {
      sendToIframe(iframeRef.current, {
        type: 'offpage:set-mode',
        payload: { mode: editMode },
      });
    }
  }, [editMode]);

  // Handle messages from iframe
  const handleMessage = useCallback(
    (event: MessageEvent<IframeToParentMessage>) => {
      const data = event.data;
      if (!data || !data.type || !data.type.startsWith('offpage:')) return;

      switch (data.type) {
        case 'offpage:section-selected':
          selectSection({
            id: data.payload.id,
            tagName: data.payload.tagName,
            outerHtml: data.payload.outerHtml,
          });
          break;

        case 'offpage:wysiwyg-done':
          if (currentProject) {
            const newSectionHtml = ensureSectionId(data.payload.outerHtml, data.payload.id);
            const updatedHtml = replaceSectionInHtml(
              currentProject.html,
              data.payload.id,
              newSectionHtml
            );
            updateProjectHtml(currentProject.id, updatedHtml);
          }
          break;

        case 'offpage:ready':
          // iframe loaded, send current mode
          if (iframeRef.current) {
            sendToIframe(iframeRef.current, {
              type: 'offpage:set-mode',
              payload: { mode: editMode },
            });
          }
          break;
      }
    },
    [editMode, currentProject, selectSection, updateProjectHtml]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Prepare HTML with injected helper script
  const srcDoc = currentProject?.html ? injectHelperScript(currentProject.html) : '';

  const viewportWidth = VIEWPORT_WIDTHS[viewport];

  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-primary)] overflow-auto p-4">
      {currentProject?.html ? (
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title="Preview"
          sandbox="allow-scripts"
          className="border border-[var(--color-border)] rounded-lg shadow-lg bg-white transition-all duration-300"
          style={{
            width: viewportWidth,
            maxWidth: '100%',
            height: '100%',
          }}
        />
      ) : (
        <p className="text-[var(--color-text-secondary)] text-sm">
          {currentProject
            ? 'Start by describing your website in the chat'
            : 'No project selected'}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/PreviewFrame.tsx
git commit -m "feat: add PreviewFrame component with iframe bridge and viewport sizing"
```

---

### Task 6: PreviewToolbar Component

**Files:**
- Create: `src/components/preview/PreviewToolbar.tsx`

Toolbar above the preview with viewport toggle and edit mode buttons.

- [ ] **Step 1: Create the PreviewToolbar component**

```tsx
// src/components/preview/PreviewToolbar.tsx
import { useEditorStore } from '../../stores/editorStore';
import { useProjectStore } from '../../stores/projectStore';
import type { EditMode, ViewportSize } from '../../stores/editorStore';

const VIEWPORTS: Array<{ value: ViewportSize; label: string; icon: string }> = [
  { value: 'desktop', label: 'Desktop', icon: '🖥' },
  { value: 'tablet', label: 'Tablet', icon: '📱' },
  { value: 'mobile', label: 'Mobile', icon: '📲' },
];

const EDIT_MODES: Array<{ value: EditMode; label: string }> = [
  { value: 'view', label: 'View' },
  { value: 'inline', label: 'Inline Edit' },
  { value: 'wysiwyg', label: 'WYSIWYG' },
];

export function PreviewToolbar() {
  const { viewport, setViewport, editMode, setEditMode } = useEditorStore();
  const currentProject = useProjectStore((s) => s.currentProject);
  const hasHtml = !!currentProject?.html;

  return (
    <div className="p-2 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] flex items-center justify-between">
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--color-text-secondary)] mr-2">Preview</span>
        {VIEWPORTS.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => setViewport(v.value)}
            disabled={!hasHtml}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              viewport === v.value
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            } ${!hasHtml ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={v.label}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        {EDIT_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setEditMode(m.value)}
            disabled={!hasHtml}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              editMode === m.value
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            } ${!hasHtml ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/PreviewToolbar.tsx
git commit -m "feat: add PreviewToolbar with viewport and edit mode toggles"
```

---

### Task 7: InlineEditBar Component

**Files:**
- Create: `src/components/preview/InlineEditBar.tsx`

A floating prompt bar that appears at the bottom of the preview when a section is selected in inline edit mode. User types a prompt, it's sent to AI for that section only.

- [ ] **Step 1: Create the InlineEditBar component**

```tsx
// src/components/preview/InlineEditBar.tsx
import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';

interface InlineEditBarProps {
  onSubmit: (sectionId: string, sectionHtml: string, prompt: string) => void;
  disabled: boolean;
}

export function InlineEditBar({ onSubmit, disabled }: InlineEditBarProps) {
  const [prompt, setPrompt] = useState('');
  const { selectedSection, editMode, clearSelection } = useEditorStore();

  if (editMode !== 'inline' || !selectedSection) return null;

  const handleSubmit = () => {
    const text = prompt.trim();
    if (!text) return;
    onSubmit(selectedSection.id, selectedSection.outerHtml, text);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      clearSelection();
    }
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg shadow-xl p-3 flex gap-2 items-center z-10">
      <div className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
        Editing: <span className="text-[var(--color-accent)]">&lt;{selectedSection.tagName.toLowerCase()}&gt;</span>
      </div>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Describe the change for this section..."
        className="flex-1 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm px-3 py-1.5 rounded border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)]"
        autoFocus
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !prompt.trim()}
        className="bg-[var(--color-accent)] text-white text-xs px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={clearSelection}
        className="text-[var(--color-text-secondary)] text-xs px-2 py-1.5 hover:text-[var(--color-text-primary)]"
      >
        Cancel
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/InlineEditBar.tsx
git commit -m "feat: add InlineEditBar for section-level AI editing prompts"
```

---

### Task 8: Extend useAiStream for Section Edits

**Files:**
- Modify: `src/hooks/useAiStream.ts`

Add a `generateSection` method that sends only the section's HTML to the AI with the `editSection` system prompt, then replaces the section in the full page HTML.

- [ ] **Step 1: Update useAiStream hook**

Add `generateSection` to the existing hook. The existing `generate` function stays unchanged.

In `src/hooks/useAiStream.ts`, add these imports at the top:

```typescript
import { replaceSectionInHtml, ensureSectionId } from '../lib/htmlSections';
import { SYSTEM_PROMPTS, buildSectionEditMessages } from '../lib/prompts';
```

Add after the existing `generate` callback (before the `return` statement):

```typescript
  const generateSection = useCallback(
    async (
      projectId: string,
      sectionId: string,
      sectionHtml: string,
      userPrompt: string,
      fullHtml: string
    ): Promise<string | null> => {
      if (sidecarStatus !== 'running') {
        console.error('Sidecar not running');
        return null;
      }

      setStreaming(true);

      unlistenRef.current = await listen<AiChunk>('ai-chunk', (event) => {
        if (!event.payload.done) {
          appendToStream(event.payload.token);
        }
      });

      try {
        const newSectionHtml = await invoke<string>('stream_generate', {
          port: sidecarPort,
          systemPrompt: SYSTEM_PROMPTS.editSection,
          messages: buildSectionEditMessages(sectionHtml, userPrompt),
          maxTokens: null,
        });

        await finalizeStream(projectId);

        const taggedSection = ensureSectionId(newSectionHtml, sectionId);
        const updatedHtml = replaceSectionInHtml(fullHtml, sectionId, taggedSection);
        await updateProjectHtml(projectId, updatedHtml);

        return updatedHtml;
      } catch (error) {
        console.error('Section edit failed:', error);
        setStreaming(false);
        return null;
      } finally {
        unlistenRef.current?.();
        unlistenRef.current = null;
      }
    },
    [sidecarPort, sidecarStatus, setStreaming, appendToStream, finalizeStream, updateProjectHtml]
  );
```

Update the return:

```typescript
  return { generate, generateSection };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAiStream.ts
git commit -m "feat: add generateSection to useAiStream for inline section editing"
```

---

### Task 9: Wire Everything into ProjectPage

**Files:**
- Modify: `src/pages/ProjectPage.tsx`

Replace the raw iframe with the new PreviewFrame, PreviewToolbar, and InlineEditBar. Wire inline edit submissions.

- [ ] **Step 1: Rewrite ProjectPage**

Replace the entire content of `src/pages/ProjectPage.tsx`:

```tsx
// src/pages/ProjectPage.tsx
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useEditorStore } from '../stores/editorStore';
import { useChatStore } from '../stores/chatStore';
import { useAiStream } from '../hooks/useAiStream';
import { ChatPanel } from '../components/chat/ChatPanel';
import { PreviewFrame } from '../components/preview/PreviewFrame';
import { PreviewToolbar } from '../components/preview/PreviewToolbar';
import { InlineEditBar } from '../components/preview/InlineEditBar';
import { sendToIframe } from '../lib/iframeBridge';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const currentProject = useProjectStore((s) => s.currentProject);
  const loadProjectById = useProjectStore((s) => s.loadProjectById);
  const createSnapshot = useProjectStore((s) => s.createSnapshot);
  const { addMessage } = useChatStore();
  const streaming = useChatStore((s) => s.streaming);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const { generateSection } = useAiStream();
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (id && !currentProject) {
      loadProjectById(id);
    }
  }, [id, currentProject, loadProjectById]);

  const handleInlineEdit = async (sectionId: string, sectionHtml: string, prompt: string) => {
    if (!currentProject) return;

    await addMessage(currentProject.id, 'user', prompt, 'inline');

    const result = await generateSection(
      currentProject.id,
      sectionId,
      sectionHtml,
      prompt,
      currentProject.html
    );

    if (result) {
      await createSnapshot(currentProject.id, result, `Inline edit: ${prompt.slice(0, 50)}`);

      // Update the section in the iframe without full reload
      if (previewIframeRef.current) {
        sendToIframe(previewIframeRef.current, {
          type: 'offpage:replace-section',
          payload: { id: sectionId, newHtml: sectionHtml },
        });
      }
    }

    clearSelection();
  };

  return (
    <div className="h-full flex">
      <ChatPanel />

      <div className="flex-1 flex flex-col relative">
        <PreviewToolbar />
        <PreviewFrame />
        <InlineEditBar onSubmit={handleInlineEdit} disabled={streaming} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProjectPage.tsx
git commit -m "feat: wire PreviewFrame, toolbar, and InlineEditBar into ProjectPage"
```

---

### Task 10: Update TopBar with Functional Viewport Toggle

**Files:**
- Modify: `src/components/layout/TopBar.tsx`

Replace the disabled placeholder buttons with functional viewport toggle that reads from and writes to the editor store.

- [ ] **Step 1: Update TopBar**

Replace the content of `src/components/layout/TopBar.tsx`:

```tsx
// src/components/layout/TopBar.tsx
import { useProjectStore } from '../../stores/projectStore';
import { useEditorStore } from '../../stores/editorStore';
import type { ViewportSize } from '../../stores/editorStore';

const VIEWPORT_OPTIONS: Array<{ value: ViewportSize; label: string }> = [
  { value: 'desktop', label: '🖥 Desktop' },
  { value: 'tablet', label: '📱 Tablet' },
  { value: 'mobile', label: '📲 Mobile' },
];

export function TopBar() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const { viewport, setViewport } = useEditorStore();
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
              disabled
              aria-disabled="true"
              className="bg-[var(--color-accent)] px-2.5 py-1 rounded-md text-xs text-white opacity-60 cursor-not-allowed"
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
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopBar.tsx
git commit -m "feat: wire TopBar viewport toggle to editor store"
```

---

### Task 11: Update ChatPanel for Edit Type Awareness

**Files:**
- Modify: `src/components/chat/ChatPanel.tsx`

Update to show inline edit messages differently and add a snapshot after each chat edit.

- [ ] **Step 1: Update ChatPanel**

Add snapshot creation after successful chat edits. In `src/components/chat/ChatPanel.tsx`:

Add import for `createSnapshot`:

```typescript
const createSnapshot = useProjectStore((s) => s.createSnapshot);
```

Update `handleSend` to create a snapshot after successful generation:

Replace the existing `handleSend` function:

```typescript
  const handleSend = async (text: string) => {
    if (!currentProject) return;

    await addMessage(currentProject.id, 'user', text, 'chat');

    const hasHtml = currentProject.html.length > 0;
    let result: string | null = null;

    if (hasHtml) {
      const chatHistory = messages
        .filter((m) => m.edit_type === 'chat')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      result = await generate(
        currentProject.id,
        SYSTEM_PROMPTS.editFull,
        buildEditMessages(currentProject.html, chatHistory, text)
      );
    } else {
      result = await generate(
        currentProject.id,
        SYSTEM_PROMPTS.generate,
        buildGenerateMessages(text, currentProject.site_type)
      );
    }

    if (result) {
      await createSnapshot(
        currentProject.id,
        result,
        hasHtml ? `Chat edit: ${text.slice(0, 50)}` : `Generated: ${text.slice(0, 50)}`
      );
    }
  };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatPanel.tsx
git commit -m "feat: add snapshot creation after chat edits and generation"
```

---

### Task 12: Final Integration Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run Vite build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Run Cargo check**

Run: `cd src-tauri && cargo check`
Expected: No errors (backend unchanged in this phase)

- [ ] **Step 4: Commit any remaining fixes**

If any compilation issues are found, fix them and commit:

```bash
git add -A
git commit -m "fix: resolve Phase 3 integration issues"
```
