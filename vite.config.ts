import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { sites } from './build/sites-vite-plugin';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), cloudflare(), sites()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
});
