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
