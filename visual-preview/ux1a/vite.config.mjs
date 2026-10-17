import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const root = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(root, '../..');
export default defineConfig(({ command, mode, isPreview }) => {
  if (command !== 'serve' || mode !== 'development' || isPreview) {
    throw new Error('UX1A_DEV_ONLY: no preview build, staging or production server');
  }
  return {
    root, envDir: false, envPrefix: 'UX1A_NO_ENV_', publicDir: false,
    cacheDir: resolve(repo, 'node_modules/.vite-ux1a'),
    plugins: [react(), {
      name: 'ux1a-loopback-only',
      configResolved(config) {
        if (config.server.host !== '127.0.0.1' || config.server.port !== 4178 || !config.server.strictPort) {
          throw new Error('UX1A_LOOPBACK_ONLY: use 127.0.0.1:4178 with strictPort');
        }
      },
    }],
    resolve: { alias: { '@': resolve(repo, 'src') } },
    server: {
      host: '127.0.0.1', port: 4178, strictPort: true, fs: { allow: [repo] },
      headers: {
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src ws://127.0.0.1:4178; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      },
    },
  };
});
