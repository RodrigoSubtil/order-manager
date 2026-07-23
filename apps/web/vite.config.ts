import { defineConfig } from 'vite';

export default defineConfig({
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
      'react-router-dom',
      '@supabase/supabase-js',
    ],
  },
});
