import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const backendTarget = process.env.VITE_DEV_API_PROXY || 'http://localhost:8080';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/backend/web',
  server: {
    port: 5175,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/health': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4175,
    host: '0.0.0.0',
  },
  plugins: [react(), nxViteTsPaths()],
  build: {
    outDir: '../../dist/backend/web',
    emptyOutDir: true,
  },
});
