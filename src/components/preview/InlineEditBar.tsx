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
