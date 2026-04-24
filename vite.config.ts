import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // 1. Gemini API Key - Standardizing on API_KEY per guidelines
  const aiApiKey = env.API_KEY || '';

  // 2. Supabase Configuration (Support both VITE_ prefix and standard names for Vercel)
  const sbUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const sbKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
  const calendlyToken = env.VITE_CALENDLY_TOKEN || '';
  const tldvApiKey = env.VITE_TLDV_API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Inject these variables into the app at build time
      'process.env.API_KEY': JSON.stringify(aiApiKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(sbUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(sbKey),
      'process.env.VITE_CALENDLY_TOKEN': JSON.stringify(calendlyToken),
      'process.env.VITE_TLDV_API_KEY': JSON.stringify(tldvApiKey),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': {},
    },
  };
});