import { defineConfig } from 'astro/config';

// En GitHub Actions se publica en https://usuario.github.io/repositorio/
const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const isUserSite = repo && repo.toLowerCase() === `${owner?.toLowerCase()}.github.io`;

export default defineConfig({
  site: owner ? `https://${owner.toLowerCase()}.github.io` : 'http://localhost:4321',
  base: repo && !isUserSite ? `/${repo}` : '/',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  // Safari anterior a 18 necesita -webkit-backdrop-filter para el efecto de cristal
  vite: { build: { cssTarget: ['chrome111', 'edge111', 'firefox114', 'safari15'] } },
});
