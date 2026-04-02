import { useLocation, useNavigate } from 'react-router-dom';
import { IconButton } from '../ui/IconButton';

const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/templates', icon: '🎨', label: 'Templates' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
] as const;

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="w-12 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col items-center pt-3 gap-3">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
        return (
          <IconButton
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={isActive}
            ariaCurrent={isActive ? 'page' : undefined}
            onClick={() => navigate(item.path)}
          />
        );
      })}
    </aside>
  );
}
