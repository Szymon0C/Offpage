export type DeployProvider = 'netlify' | 'vercel' | 'github-pages';

export interface ProviderInfo {
  id: DeployProvider;
  name: string;
  description: string;
  tokenUrl: string;
  tokenHelp: string;
  placeholder: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'netlify',
    name: 'Netlify',
    description: 'Deploy to Netlify with a single click',
    tokenUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
    tokenHelp: 'Create a Personal Access Token in Netlify settings',
    placeholder: 'nfp_xxxxxxxxxxxx',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy to Vercel instantly',
    tokenUrl: 'https://vercel.com/account/tokens',
    tokenHelp: 'Create a token in Vercel account settings',
    placeholder: 'vc_xxxxxxxxxxxx',
  },
  {
    id: 'github-pages',
    name: 'GitHub Pages',
    description: 'Host on GitHub Pages for free',
    tokenUrl: 'https://github.com/settings/tokens/new?scopes=repo',
    tokenHelp: 'Create a token with "repo" scope',
    placeholder: 'ghp_xxxxxxxxxxxx',
  },
];

export function getProvider(id: DeployProvider): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id)!;
}
