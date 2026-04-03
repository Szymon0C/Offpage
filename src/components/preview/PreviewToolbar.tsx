import { useEditorStore } from '../../stores/editorStore';
import { useProjectStore } from '../../stores/projectStore';
import type { EditMode } from '../../stores/editorStore';

const EDIT_MODES: Array<{ value: EditMode; label: string }> = [
  { value: 'view', label: 'View' },
  { value: 'inline', label: 'Inline Edit' },
  { value: 'wysiwyg', label: 'WYSIWYG' },
];

export function PreviewToolbar() {
  const { editMode, setEditMode } = useEditorStore();
  const currentProject = useProjectStore((s) => s.currentProject);
  const hasHtml = !!currentProject?.html;

  return (
    <div className="p-2 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] flex items-center justify-between">
      <span className="text-xs text-[var(--color-text-secondary)]">Preview</span>
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
