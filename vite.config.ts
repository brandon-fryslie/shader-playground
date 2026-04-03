import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
  // Set base to repo name when deploying to GitHub Pages so asset paths resolve correctly.
  // VITE_BASE is injected by the GitHub Actions workflow; local dev leaves it unset.
  base: process.env.VITE_BASE ?? '/',
  server: {
    host: '0.0.0.0',
    port: 4443,
    https: fs.existsSync('./cert.pem') ? {
      key: fs.readFileSync('./key.pem'),
      cert: fs.readFileSync('./cert.pem'),
    } : undefined,
  },
  assetsInclude: ['**/*.wgsl'],
});
