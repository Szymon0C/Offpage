import { create } from 'zustand';
import { getDatabase } from '../db/database';
import type { Project, SiteType } from '../types/project';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  loadProjects: () => Promise<void>;
  loadProjectById: (id: string) => Promise<void>;
  createProject: (name: string, siteType: SiteType) => Promise<Project>;
  setCurrentProject: (project: Project | null) => void;
  updateProjectHtml: (id: string, html: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createSnapshot: (projectId: string, html: string, description: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, _get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    try {
      const db = await getDatabase();
      const projects = await db.select<Project[]>(
        'SELECT * FROM projects ORDER BY updated_at DESC'
      );
      set({ projects, loading: false });
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({ loading: false });
    }
  },

  loadProjectById: async (id: string) => {
    set({ loading: true });
    const db = await getDatabase();
    const rows = await db.select<Project[]>(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );
    set({ currentProject: rows[0] ?? null, loading: false });
  },

  createProject: async (name: string, siteType: SiteType) => {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO projects (id, name, site_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, siteType, now, now]
    );
    const project: Project = {
      id,
      name,
      html: '',
      template_id: null,
      site_type: siteType,
      deploy_config: null,
      created_at: now,
      updated_at: now,
    };
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  updateProjectHtml: async (id: string, html: string) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.execute(
      'UPDATE projects SET html = ?, updated_at = ? WHERE id = ?',
      [html, now, id]
    );
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, html, updated_at: now } : p
      ),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, html, updated_at: now }
          : state.currentProject,
    }));
  },

  deleteProject: async (id: string) => {
    const db = await getDatabase();
    await db.execute('DELETE FROM projects WHERE id = ?', [id]);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject:
        state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  createSnapshot: async (projectId: string, html: string, description: string) => {
    const db = await getDatabase();
    const id = crypto.randomUUID();

    await db.execute('BEGIN TRANSACTION');
    try {
      const rows = await db.select<Array<{ max_version: number | null }>>(
        'SELECT MAX(version) as max_version FROM snapshots WHERE project_id = ?',
        [projectId]
      );
      const nextVersion = (rows[0]?.max_version ?? 0) + 1;
      await db.execute(
        'INSERT INTO snapshots (id, project_id, html, description, version) VALUES (?, ?, ?, ?, ?)',
        [id, projectId, html, description, nextVersion]
      );
      await db.execute('COMMIT');
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  },
}));
