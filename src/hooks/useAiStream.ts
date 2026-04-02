import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useChatStore } from '../stores/chatStore';
import { useAiStore } from '../stores/aiStore';
import { useProjectStore } from '../stores/projectStore';

interface AiChunk {
  token: string;
  done: boolean;
}

export function useAiStream() {
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const sidecarPort = useAiStore((s) => s.sidecarPort);
  const sidecarStatus = useAiStore((s) => s.sidecarStatus);
  const { setStreaming, appendToStream, finalizeStream } = useChatStore();
  const updateProjectHtml = useProjectStore((s) => s.updateProjectHtml);

  useEffect(() => {
    return () => {
      unlistenRef.current?.();
    };
  }, []);

  const generate = useCallback(
    async (
      projectId: string,
      systemPrompt: string,
      messages: Array<{ role: string; content: string }>,
      maxTokens?: number
    ): Promise<string | null> => {
      if (sidecarStatus !== 'running') {
        console.error('Sidecar not running');
        return null;
      }

      setStreaming(true);

      unlistenRef.current = await listen<AiChunk>('ai-chunk', (event) => {
        if (!event.payload.done) {
          appendToStream(event.payload.token);
        }
      });

      try {
        const fullHtml = await invoke<string>('stream_generate', {
          messages,
          system_prompt: systemPrompt,
          max_tokens: maxTokens ?? null,
        });

        await finalizeStream(projectId);
        await updateProjectHtml(projectId, fullHtml);

        return fullHtml;
      } catch (error) {
        console.error('AI generation failed:', error);
        setStreaming(false);
        return null;
      } finally {
        unlistenRef.current?.();
        unlistenRef.current = null;
      }
    },
    [sidecarPort, sidecarStatus, setStreaming, appendToStream, finalizeStream, updateProjectHtml]
  );

  return { generate };
}