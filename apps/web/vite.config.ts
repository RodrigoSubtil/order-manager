import { defineConfig, loadEnv } from 'vite';

const homologationUrl = 'https://czbrnxrpofdbbgbdyrad.supabase.co';

export default defineConfig(({ mode }) => {
  if (mode === 'development') {
    const configuredUrl =
      process.env.VITE_SUPABASE_URL ?? loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL;
    if (configuredUrl !== homologationUrl) {
      throw new Error(
        'O modo dev só pode usar o Supabase de homologação. Verifique apps/web/.env.development.local.',
      );
    }
  }
  return {
    cacheDir: '../../node_modules/.vite/order-manager-web',
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      entries: ['src/main.tsx'],
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-dom/client',
        '@supabase/supabase-js',
      ],
    },
  };
});
