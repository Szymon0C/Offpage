import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChatStore } from '../../stores/chatStore';
import { useAiStore } from '../../stores/aiStore';
import { useProjectStore } from '../../stores/projectStore';
import { useAiStream } from '../../hooks/useAiStream';
import {
  SYSTEM_PROMPTS,
  buildGenerateMessages,
  buildEditMessages,
} from '../../lib/prompts';

export function ChatPanel() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const { messages, streaming, streamBuffer, loadMessages, addMessage } =
    useChatStore();
  const createSnapshot = useProjectStore((s) => s.createSnapshot);
  const sidecarStatus = useAiStore((s) => s.sidecarStatus);
  const { generate } = useAiStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentProject) {
      loadMessages(currentProject.id);
    }
  }, [currentProject?.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamBuffer]);

  const handleSend = async (text: string) => {
    if (!currentProject) return;

    await addMessage(currentProject.id, 'user', text, 'chat');

    const hasHtml = currentProject.html.length > 0;
    let result: string | null = null;

    if (hasHtml) {
      const chatHistory = messages
        .filter((m) => m.edit_type === 'chat')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      result = await generate(
        currentProject.id,
        SYSTEM_PROMPTS.editFull,
        buildEditMessages(currentProject.html, chatHistory, text)
      );
    } else {
      result = await generate(
        currentProject.id,
        SYSTEM_PROMPTS.generate,
        buildGenerateMessages(text, currentProject.site_type)
      );
    }

    if (result) {
      await createSnapshot(
        currentProject.id,
        result,
        hasHtml ? `Chat edit: ${text.slice(0, 50)}` : `Generated: ${text.slice(0, 50)}`
      );
    }
  };

  const isReady = sidecarStatus === 'running';

  return (
    <div className="w-[300px] bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border)] flex flex-col">
      <div className="p-3 border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
        <span>AI Chat</span>
        <span
          className={`w-2 h-2 rounded-full ${
            sidecarStatus === 'running'
              ? 'bg-green-500'
              : sidecarStatus === 'starting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
          }`}
          title={`AI: ${sidecarStatus}`}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {messages.length === 0 && !streaming && (
          <div className="text-xs text-[var(--color-text-secondary)] text-center mt-8">
            {isReady
              ? 'Describe the website you want to create.'
              : 'Waiting for AI model to load...'}
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {streaming && streamBuffer && (
          <ChatMessage role="assistant" content={streamBuffer} />
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        disabled={!isReady || streaming}
        placeholder={
          isReady ? 'Describe what you want...' : 'AI model loading...'
        }
      />
    </div>
  );
}
