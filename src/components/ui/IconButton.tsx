interface IconButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  ariaCurrent?: 'page' | undefined;
  onClick: () => void;
}

export function IconButton({ icon, label, active, ariaCurrent, onClick }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={ariaCurrent}
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors cursor-pointer ${
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)] hover:text-white'
      }`}
    >
      {icon}
    </button>
  );
}
