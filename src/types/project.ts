export interface Project {
  id: string;
  name: string;
  html: string;
  template_id: string | null;
  site_type: SiteType;
  deploy_config: DeployConfig | null;
  created_at: string;
  updated_at: string;
}

export type SiteType = 'landing' | 'portfolio' | 'blog' | 'ecommerce';

export interface DeployConfig {
  provider: 'netlify' | 'vercel' | 'github-pages';
  site_id: string;
  url: string;
}

export interface Snapshot {
  id: string;
  project_id: string;
  html: string;
  description: string;
  version: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  edit_type: 'chat' | 'inline' | 'wysiwyg' | null;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  category: SiteType;
  html: string;
  thumbnail: Uint8Array | null;
  version: string;
}

export interface Settings {
  key: string;
  value: unknown;
}
