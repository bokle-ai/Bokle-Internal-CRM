import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Standardize on AI_API_KEY. Check for API_KEY as a fallback.
  // We inject this string into the build.
  const aiApiKey = env.AI_API_KEY || env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // 1. Inject the API Key strictly as a string
      'process.env.AI_API_KEY': JSON.stringify(aiApiKey),
      // 2. Preserve NODE_ENV to avoid breaking React/Libraries
      'process.env.NODE_ENV': JSON.stringify(mode),
      // 3. Polyfill the remaining 'process.env' object safely
      'process.env': {},
    },
  };
});