import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useChatStore } from '../stores/chatStore';
import { useAiStore } from '../stores/aiStore';
import { useProjectStore } from '../stores/projectStore';
import { replaceSectionInHtml, ensureSectionId } from '../lib/htmlSections';
import { SYSTEM_PROMPTS, buildSectionEditMessages, extractHtml } from '../lib/prompts';

interface AiChunk {
  token: string;
  done: boolean;
}

export function useAiStream() {
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const sidecarPort = useAiStore((s) => s.sidecarPort);
  const sidecarStatus = useAiStore((s) => s.sidecarStatus);
  const { setStreaming, setStreamStatus, addMessage } = useChatStore();
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
      setStreamStatus('Generating...');

      // Track token count for status updates
      let tokenCount = 0;
      const unlisten = await listen<AiChunk>('ai-chunk', (event) => {
        if (!event.payload.done) {
          tokenCount++;
          if (tokenCount % 50 === 0) {
            setStreamStatus(`Generating... (${tokenCount} tokens)`);
          }
        }
      });
      unlistenRef.current = unlisten;

      try {
        const rawResponse = await invoke<string>('stream_generate', {
          messages,
          systemPrompt,
          maxTokens: maxTokens ?? null,
        });

        const cleanHtml = extractHtml(rawResponse);
        await updateProjectHtml(projectId, cleanHtml);

        // Save a friendly summary message instead of raw HTML
        const isEdit = systemPrompt === SYSTEM_PROMPTS.editFull;
        const summary = isEdit
          ? 'Done! I\'ve updated the page with your changes.'
          : 'Done! Your website has been generated. Check the preview!';
        await addMessage(projectId, 'assistant', summary, 'chat');

        setStreaming(false);
        return cleanHtml;
      } catch (error) {
        console.error('AI generation failed:', error);
        await addMessage(projectId, 'assistant', `Generation failed: ${error}`, 'chat');
        setStreaming(false);
        return null;
      } finally {
        unlisten();
        if (unlistenRef.current === unlisten) {
          unlistenRef.current = null;
        }
      }
    },
    [sidecarPort, sidecarStatus, setStreaming, setStreamStatus, addMessage, updateProjectHtml]
  );

  const generateSection = useCallback(
    async (
      projectId: string,
      sectionId: string,
      sectionHtml: string,
      userPrompt: string,
      fullHtml: string
    ): Promise<string | null> => {
      if (sidecarStatus !== 'running') {
        console.error('Sidecar not running');
        return null;
      }

      setStreaming(true);
      setStreamStatus('Editing section...');

      let tokenCount = 0;
      const unlisten = await listen<AiChunk>('ai-chunk', (event) => {
        if (!event.payload.done) {
          tokenCount++;
          if (tokenCount % 50 === 0) {
            setStreamStatus(`Editing section... (${tokenCount} tokens)`);
          }
        }
      });
      unlistenRef.current = unlisten;

      try {
        const newSectionHtml = await invoke<string>('stream_generate', {
          messages: buildSectionEditMessages(sectionHtml, userPrompt),
          systemPrompt: SYSTEM_PROMPTS.editSection,
          maxTokens: null,
        });

        const taggedSection = ensureSectionId(newSectionHtml, sectionId);
        const updatedHtml = replaceSectionInHtml(fullHtml, sectionId, taggedSection);
        await updateProjectHtml(projectId, updatedHtml);

        await addMessage(projectId, 'assistant', 'Done! Section updated.', 'inline');
        setStreaming(false);

        return updatedHtml;
      } catch (error) {
        console.error('Section edit failed:', error);
        await addMessage(projectId, 'assistant', `Section edit failed: ${error}`, 'inline');
        setStreaming(false);
        return null;
      } finally {
        unlisten();
        if (unlistenRef.current === unlisten) {
          unlistenRef.current = null;
        }
      }
    },
    [sidecarPort, sidecarStatus, setStreaming, setStreamStatus, addMessage, updateProjectHtml]
  );

  return { generate, generateSection };
}
