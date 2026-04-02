import { useProjectStore } from '../../stores/projectStore';

export function TopBar() {
  const currentProject = useProjectStore((s) => s.currentProject);

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
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="bg-[var(--color-bg-elevated)] px-2.5 py-1 rounded-md text-xs text-[var(--color-text-secondary)] opacity-60 cursor-not-allowed"
            >
              📱 Mobile
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="bg-[var(--color-accent)] px-2.5 py-1 rounded-md text-xs text-white opacity-60 cursor-not-allowed"
            >
              🚀 Deploy
            </button>
          </>
        )}
      </div>
    </header>
  );
}
