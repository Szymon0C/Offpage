import type { SiteType } from '../../types/project';

interface TemplateCardProps {
  id: string;
  name: string;
  category: SiteType;
  html: string;
  onSelect: (id: string) => void;
}

const CATEGORY_COLORS: Record<SiteType, string> = {
  landing: 'bg-indigo-500/20 text-indigo-400',
  portfolio: 'bg-emerald-500/20 text-emerald-400',
  blog: 'bg-amber-500/20 text-amber-400',
  ecommerce: 'bg-rose-500/20 text-rose-400',
};

export function TemplateCard({ id, name, category, html, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="bg-[var(--color-bg-elevated)] rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all hover:shadow-lg text-left group"
    >
      <div className="h-48 bg-white relative overflow-hidden">
        <iframe
          srcDoc={html}
          title={name}
          sandbox=""
          className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
          tabIndex={-1}
        />
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
          {name}
        </h3>
        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category]}`}>
          {category}
        </span>
      </div>
    </button>
  );
}
