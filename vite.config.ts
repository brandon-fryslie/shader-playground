import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
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
