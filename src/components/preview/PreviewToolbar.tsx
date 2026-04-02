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
