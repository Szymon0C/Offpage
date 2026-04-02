import { create } from 'zustand';

export type EditMode = 'view' | 'inline' | 'wysiwyg';
export type ViewportSize = 'desktop' | 'tablet' | 'mobile';

export interface SelectedSection {
  id: string;
  tagName: string;
  outerHtml: string;
}

interface EditorState {
  editMode: EditMode;
  viewport: ViewportSize;
  selectedSection: SelectedSection | null;
  setEditMode: (mode: EditMode) => void;
  setViewport: (size: ViewportSize) => void;
  selectSection: (section: SelectedSection | null) => void;
  clearSelection: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  editMode: 'view',
  viewport: 'desktop',
  selectedSection: null,

  setEditMode: (mode) => set({ editMode: mode, selectedSection: null }),
  setViewport: (size) => set({ viewport: size }),
  selectSection: (section) => set({ selectedSection: section }),
  clearSelection: () => set({ selectedSection: null }),
}));
