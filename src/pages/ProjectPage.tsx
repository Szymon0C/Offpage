import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useEditorStore } from '../stores/editorStore';
import { useChatStore } from '../stores/chatStore';
import { useAiStream } from '../hooks/useAiStream';
import { SYSTEM_PROMPTS, buildEditMessages } from '../lib/prompts';
import { ChatPanel } from '../components/chat/ChatPanel';
import { PreviewFrame } from '../components/preview/PreviewFrame';
import { PreviewToolbar } from '../components/preview/PreviewToolbar';
import { InlineEditBar } from '../components/preview/InlineEditBar';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentProject = useProjectStore((s) => s.currentProject);
  const loadProjectById = useProjectStore((s) => s.loadProjectById);
  const createSnapshot = useProjectStore((s) => s.createSnapshot);
  const { addMessage } = useChatStore();
  const streaming = useChatStore((s) => s.streaming);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const { generate, generateSection } = useAiStream();
  const initialPromptSent = useRef(false);

  useEffect(() => {
    if (id) {
      loadProjectById(id);
    }
  }, [id, loadProjectById]);

  // Auto-send template customization prompt from ?prompt= query param
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (prompt && currentProject?.html && !initialPromptSent.current && !streaming) {
      initialPromptSent.current = true;
      setSearchParams({}, { replace: true });

      const chatHistory: Array<{ role: string; content: string }> = [];
      addMessage(currentProject.id, 'user', prompt, 'chat');
      generate(
        currentProject.id,
        SYSTEM_PROMPTS.editFull,
        buildEditMessages(currentProject.html, chatHistory, prompt)
      ).then((result) => {
        if (result) {
          createSnapshot(currentProject.id, result, `Template customization: ${prompt.slice(0, 50)}`);
        }
      });
    }
  }, [searchParams, currentProject, streaming, setSearchParams, addMessage, generate, createSnapshot]);

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

      <div className="flex-1 flex flex-col relative min-h-0">
        <PreviewToolbar />
        <PreviewFrame />
        <InlineEditBar onSubmit={handleInlineEdit} disabled={streaming} />
      </div>
    </div>
  );
}
