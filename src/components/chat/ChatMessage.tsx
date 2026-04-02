interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
          isUser
            ? 'bg-[var(--color-accent)] text-white rounded-br-sm'
            : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] rounded-bl-sm'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
