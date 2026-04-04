import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ModelSetup } from "./ModelSetup";
import { useChatStore } from "../../stores/chatStore";
import { useAiStore } from "../../stores/aiStore";
import { useProjectStore } from "../../stores/projectStore";
import { useAiStream } from "../../hooks/useAiStream";
import {
  SYSTEM_PROMPTS,
  buildGenerateMessages,
  buildEditMessages,
} from "../../lib/prompts";

export function ChatPanel() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const { messages, streaming, streamStatus, loadMessages, addMessage } =
    useChatStore();
  const createSnapshot = useProjectStore((s) => s.createSnapshot);
  const { sidecarStatus, detectHardware, isDownloading, downloadProgress, error, checkModelExists, getModelPath, startSidecar } = useAiStore();
  const { generate } = useAiStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (currentProject) {
      loadMessages(currentProject.id);
    }
  }, [currentProject?.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamStatus]);

  // Initialize AI on first render
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initAI = async () => {
      try {
        console.log('[ChatPanel] initAI starting...');
        await detectHardware();

        const modelFiles = ['qwen2.5-coder-7b-instruct-q4_0.gguf', 'qwen2.5-coder-3b-instruct-q4_0.gguf'];

        for (const filename of modelFiles) {
          const exists = await checkModelExists(filename);
          if (exists) {
            console.log('[ChatPanel] Found existing model:', filename);
            const modelPath = await getModelPath(filename);
            await startSidecar(modelPath);
            console.log('[ChatPanel] initAI complete — sidecar started');
            break;
          }
        }
        console.log('[ChatPanel] initAI done, no model found — showing ModelSetup');
      } catch (error) {
        console.error('[ChatPanel] AI initialization failed:', error);
      }
    };

    initAI();
  }, [detectHardware, checkModelExists, getModelPath, startSidecar]);

  const handleSend = async (text: string) => {
    if (!currentProject) return;

    await addMessage(currentProject.id, "user", text, "chat");

    const hasHtml = !!currentProject.html && currentProject.html.length > 0;
    let result: string | null = null;

    if (hasHtml) {
      const chatHistory = messages
        .filter((m) => m.edit_type === "chat")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      result = await generate(
        currentProject.id,
        SYSTEM_PROMPTS.editFull,
        buildEditMessages(currentProject.html, chatHistory, text),
      );
    } else {
      result = await generate(
        currentProject.id,
        SYSTEM_PROMPTS.generate,
        buildGenerateMessages(text, currentProject.site_type),
      );
    }

    if (result) {
      await createSnapshot(
        currentProject.id,
        result,
        hasHtml
          ? `Chat edit: ${text.slice(0, 50)}`
          : `Generated: ${text.slice(0, 50)}`,
      );
    }
  };

  const isReady = sidecarStatus === "running";

  return (
    <div className="w-[300px] bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border)] flex flex-col">
      <div className="p-3 border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
        <span>AI Chat</span>
        <span
          className={`w-2 h-2 rounded-full ${
            sidecarStatus === "running"
              ? "bg-green-500"
              : sidecarStatus === "starting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-red-500"
          }`}
          title={`AI: ${sidecarStatus}`}
        />
      </div>

      {isDownloading && (
        <div className="px-3 pb-2">
          {downloadProgress ? (
            <>
              <div className="text-xs font-medium text-[var(--color-text-primary)] mb-1">
                Downloading model: {downloadProgress.percentage.toFixed(1)}%
              </div>
              <div className="w-full h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-accent)] transition-all"
                  style={{ width: `${downloadProgress.percentage}%` }}
                />
              </div>
              <div className="mt-1 text-[var(--color-text-secondary)] text-[10px]">
                {((downloadProgress.downloaded / 1024 / 1024 / 1024).toFixed(2))}GB / {((downloadProgress.total / 1024 / 1024 / 1024).toFixed(2))}GB
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--color-text-secondary)]">
              Preparing download...
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {(sidecarStatus === "stopped" || sidecarStatus === "error") && !isDownloading ? (
          <ModelSetup />
        ) : messages.length === 0 && !streaming ? (
          <div className="text-xs text-[var(--color-text-secondary)] text-center mt-8 space-y-1">
            {sidecarStatus === "running"
              ? "Describe the website you want to create."
              : sidecarStatus === "starting"
                ? "Starting AI model..."
                : sidecarStatus === "error"
                  ? "AI model failed to start. Try downloading again."
                  : "Setting up AI model..."}
            {error && (
              <div className="text-red-500 text-xs mt-1">
                Error: {error}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
            ))}

            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] rounded-bl-sm flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                  {streamStatus || 'Generating...'}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput
        onSend={handleSend}
        disabled={!isReady || streaming || isDownloading}
        placeholder={
          sidecarStatus === "running"
            ? "Describe what you want..."
            : sidecarStatus === "starting"
              ? "Starting AI model..."
              : isDownloading
                ? "Downloading AI model..."
                : "AI model not available"
        }
      />
    </div>
  );
}
