import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">404</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">Page not found</p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="bg-[var(--color-accent)] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
      >
        Go Home
      </button>
    </div>
  );
}
