import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" TS error
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // 1. Inject the API Key strictly as a string
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // 2. Polyfill the remaining 'process.env' object to prevent crashes in libraries
      'process.env': {},
    },
  };
});