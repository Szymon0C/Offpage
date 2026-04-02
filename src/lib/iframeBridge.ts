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
