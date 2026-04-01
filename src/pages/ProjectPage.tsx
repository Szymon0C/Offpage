import { useProjectStore } from '../stores/projectStore';

export function ProjectPage() {
  const currentProject = useProjectStore((s) => s.currentProject);

  return (
    <div className="h-full flex">
      {/* Chat panel — placeholder */}
      <div className="w-[300px] bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border)] flex flex-col">
        <div className="p-3 border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
          AI Chat
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
          Chat coming in Phase 2
        </div>
        <div className="p-2 border-t border-[var(--color-border)]">
          <div className="bg-[var(--color-bg-elevated)] p-2 rounded-lg text-xs text-[var(--color-text-secondary)]">
            Describe what you want...
          </div>
        </div>
      </div>

      {/* Preview area — placeholder */}
      <div className="flex-1 flex flex-col">
        <div className="p-2 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex justify-between">
          <span>Live Preview</span>
          <span>1280 × 720</span>
        </div>
        <div className="flex-1 bg-white flex items-center justify-center">
          <p className="text-gray-400 text-sm">
            {currentProject
              ? 'Preview coming in Phase 3'
              : 'No project selected'}
          </p>
        </div>
      </div>
    </div>
  );
}
