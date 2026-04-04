import { create } from 'zustand';
import { getDatabase } from '../db/database';
import type { ChatMessage } from '../types/project';

interface ChatState {
  messages: ChatMessage[];
  streaming: boolean;
  streamStatus: string;
  loadMessages: (projectId: string) => Promise<void>;
  addMessage: (
    projectId: string,
    role: 'user' | 'assistant',
    content: string,
    editType?: 'chat' | 'inline' | 'wysiwyg' | null
  ) => Promise<ChatMessage>;
  setStreaming: (streaming: boolean) => void;
  setStreamStatus: (status: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, _get) => ({
  messages: [],
  streaming: false,
  streamStatus: '',

  loadMessages: async (projectId: string) => {
    const db = await getDatabase();
    const messages = await db.select<ChatMessage[]>(
      'SELECT * FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    set({ messages });
  },

  addMessage: async (projectId, role, content, editType = null) => {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO chat_messages (id, project_id, role, content, edit_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, projectId, role, content, editType, now]
    );
    const message: ChatMessage = {
      id,
      project_id: projectId,
      role,
      content,
      edit_type: editType,
      created_at: now,
    };
    set((state) => ({ messages: [...state.messages, message] }));
    return message;
  },

  setStreaming: (streaming) => {
    set({ streaming, streamStatus: streaming ? '' : '' });
  },

  setStreamStatus: (status) => {
    set({ streamStatus: status });
  },

  clearMessages: () => {
    set({ messages: [], streaming: false, streamStatus: '' });
  },
}));
