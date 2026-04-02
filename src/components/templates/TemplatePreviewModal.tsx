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
