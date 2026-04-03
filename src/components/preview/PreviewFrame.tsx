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
  const projectRef = useRef(currentProject);
  projectRef.current = currentProject;

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
          if (projectRef.current) {
            const newSectionHtml = ensureSectionId(data.payload.outerHtml, data.payload.id);
            const updatedHtml = replaceSectionInHtml(
              projectRef.current.html,
              data.payload.id,
              newSectionHtml
            );
            updateProjectHtml(projectRef.current.id, updatedHtml);
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
    [editMode, selectSection, updateProjectHtml]
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
      {currentProject?.html && currentProject.html.trim() ? (
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
        <div className="text-center space-y-4">
          <div className="text-4xl">🎨</div>
          <p className="text-[var(--color-text-secondary)] text-lg">
            {currentProject
              ? 'Start by describing your website in the chat'
              : 'No project selected'}
          </p>
          {currentProject && (
            <p className="text-[var(--color-text-secondary)] text-sm">
              Tell the AI what kind of website you want to create!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
