import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { ChatPanel } from '../components/chat/ChatPanel';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const currentProject = useProjectStore((s) => s.currentProject);
  const loadProjectById = useProjectStore((s) => s.loadProjectById);

  useEffect(() => {
    if (id && !currentProject) {
      loadProjectById(id);
    }
  }, [id, currentProject, loadProjectById]);

  return (
    <div className="h-full flex">
      <ChatPanel />

      <div className="flex-1 flex flex-col">
        <div className="p-2 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex justify-between">
          <span>Live Preview</span>
          <span>1280 × 720</span>
        </div>
        <div className="flex-1 bg-white flex items-center justify-center">
          {currentProject?.html ? (
            <iframe
              srcDoc={currentProject.html}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts"
            />
          ) : (
            <p className="text-gray-400 text-sm">
              {currentProject
                ? 'Start by describing your website in the chat'
                : 'No project selected'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
