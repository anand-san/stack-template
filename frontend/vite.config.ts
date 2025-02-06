import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dir, './src'),
      },
    },
    optimizeDeps: {
      exclude: ['./src/'],
    },
    server: {
      host: true, // Needed for Docker
      port: 5173,
      strictPort: true,
      watch: {
        usePolling: env.DEV ? true : false,
      },
    },
  };
});
