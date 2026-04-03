import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';

export function HomePage() {
  const { projects, loading, loadProjects, createProject, setCurrentProject } =
    useProjectStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects().catch((error) => console.error('Failed to load projects:', error));
  }, [loadProjects]);

  const handleNewProject = async () => {
    try {
      const project = await createProject('Untitled Site', 'landing');
      setCurrentProject(project);
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleOpenProject = (project: (typeof projects)[0]) => {
    setCurrentProject(project);
    navigate(`/project/${project.id}`);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-2">Welcome to Offpage</h1>
      <p className="text-[var(--color-text-secondary)] mb-8">
        Generate websites with AI — entirely on your device.
      </p>

      <div className="flex gap-3 mb-8">
        <button
          onClick={handleNewProject}
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          + New Project
        </button>
        <button
          onClick={() => navigate('/templates')}
          className="bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] px-6 py-3 rounded-lg text-sm font-medium hover:bg-[var(--color-bg-primary)] transition-colors border border-[var(--color-border)]"
        >
          From Template
        </button>
      </div>

      {loading && (
        <p className="text-[var(--color-text-secondary)] text-sm">Loading...</p>
      )}

      {!loading && projects.length === 0 && (
        <p className="text-[var(--color-text-secondary)] text-sm">
          No projects yet. Create one to get started!
        </p>
      )}

      {!loading && projects.length > 0 && (
        <div className="w-full max-w-lg">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
            Recent Projects
          </h2>
          <div className="flex flex-col gap-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleOpenProject(project)}
                className="bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg p-3 text-left transition-colors"
              >
                <div className="text-sm font-medium">{project.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {project.site_type} · {new Date(project.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
