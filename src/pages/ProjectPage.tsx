import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useEditorStore } from '../stores/editorStore';
import { useChatStore } from '../stores/chatStore';
import { useAiStream } from '../hooks/useAiStream';
import { ChatPanel } from '../components/chat/ChatPanel';
import { PreviewFrame } from '../components/preview/PreviewFrame';
import { PreviewToolbar } from '../components/preview/PreviewToolbar';
import { InlineEditBar } from '../components/preview/InlineEditBar';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const currentProject = useProjectStore((s) => s.currentProject);
  const loadProjectById = useProjectStore((s) => s.loadProjectById);
  const createSnapshot = useProjectStore((s) => s.createSnapshot);
  const { addMessage } = useChatStore();
  const streaming = useChatStore((s) => s.streaming);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const { generateSection } = useAiStream();

  useEffect(() => {
    if (id && !currentProject) {
      loadProjectById(id);
    }
  }, [id, currentProject, loadProjectById]);

  const handleInlineEdit = async (sectionId: string, sectionHtml: string, prompt: string) => {
    if (!currentProject) return;

    await addMessage(currentProject.id, 'user', prompt, 'inline');

    const result = await generateSection(
      currentProject.id,
      sectionId,
      sectionHtml,
      prompt,
      currentProject.html
    );

    if (result) {
      await createSnapshot(currentProject.id, result, `Inline edit: ${prompt.slice(0, 50)}`);
    }

    clearSelection();
  };

  return (
    <div className="h-full flex">
      <ChatPanel />

      <div className="flex-1 flex flex-col relative">
        <PreviewToolbar />
        <PreviewFrame />
        <InlineEditBar onSubmit={handleInlineEdit} disabled={streaming} />
      </div>
    </div>
  );
}
