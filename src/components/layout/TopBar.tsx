import { useProjectStore } from '../../stores/projectStore';
import { useEditorStore } from '../../stores/editorStore';
import { useDeployStore } from '../../stores/deployStore';
import type { ViewportSize } from '../../stores/editorStore';

const VIEWPORT_OPTIONS: Array<{ value: ViewportSize; label: string }> = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
];

export function TopBar() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const { viewport, setViewport } = useEditorStore();
  const openModal = useDeployStore((s) => s.openModal);
  const hasHtml = !!currentProject?.html;

  return (
    <header className="h-10 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <span className="font-bold text-sm text-white">Offpage</span>
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
              onClick={openModal}
              disabled={!hasHtml}
              className={`bg-[var(--color-accent)] px-3 py-1 rounded-md text-xs text-white transition-opacity ${
                !hasHtml ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              Deploy
            </button>
          </>
        )}
      </div>
    </header>
  );
}
