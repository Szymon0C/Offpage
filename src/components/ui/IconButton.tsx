interface IconButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function IconButton({ icon, label, active, onClick }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
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
