import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplateStore } from '../stores/templateStore';
import { useProjectStore } from '../stores/projectStore';
import { TemplateCard } from '../components/templates/TemplateCard';
import { TemplatePreviewModal } from '../components/templates/TemplatePreviewModal';
import type { Template } from '../stores/templateStore';
import type { SiteType } from '../types/project';

const CATEGORIES: Array<{ value: SiteType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'landing', label: 'Landing' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'blog', label: 'Blog' },
  { value: 'ecommerce', label: 'E-commerce' },
];

export function TemplatesPage() {
  const { templates, filter, loading, loadTemplates, setFilter, filteredTemplates } =
    useTemplateStore();
  const { createProject, updateProjectHtml, setCurrentProject } = useProjectStore();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (templates.length === 0) {
      loadTemplates();
    }
  }, [templates.length, loadTemplates]);

  const handleSelectCard = (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setSelectedTemplate(tpl);
  };

  const handleUseTemplate = async (templateId: string, customPrompt?: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    const project = await createProject(tpl.name, tpl.category);
    await updateProjectHtml(project.id, tpl.html);
    setCurrentProject({ ...project, html: tpl.html });
    setSelectedTemplate(null);

    navigate(`/project/${project.id}${customPrompt ? `?prompt=${encodeURIComponent(customPrompt)}` : ''}`);
  };

  const displayed = filteredTemplates();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Templates</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Pick a template as your starting point, then customize with AI or edit directly.
        </p>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setFilter(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === cat.value
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        {loading ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Loading templates...</p>
        ) : displayed.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No templates found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                id={tpl.id}
                name={tpl.name}
                category={tpl.category}
                html={tpl.html}
                onSelect={handleSelectCard}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onUse={handleUseTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
