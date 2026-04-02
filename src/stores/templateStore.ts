import { create } from 'zustand';
import { getDatabase } from '../db/database';
import type { SiteType } from '../types/project';

export interface Template {
  id: string;
  name: string;
  category: SiteType;
  html: string;
  version: string;
}

interface TemplateState {
  templates: Template[];
  filter: SiteType | 'all';
  loading: boolean;
  loadTemplates: () => Promise<void>;
  setFilter: (filter: SiteType | 'all') => void;
  filteredTemplates: () => Template[];
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  filter: 'all',
  loading: false,

  loadTemplates: async () => {
    set({ loading: true });
    try {
      const db = await getDatabase();
      const templates = await db.select<Template[]>(
        'SELECT id, name, category, html, version FROM templates ORDER BY category, name'
      );
      set({ templates, loading: false });
    } catch (error) {
      console.error('Failed to load templates:', error);
      set({ loading: false });
    }
  },

  setFilter: (filter) => set({ filter }),

  filteredTemplates: () => {
    const { templates, filter } = get();
    if (filter === 'all') return templates;
    return templates.filter((t) => t.category === filter);
  },
}));
