import { defineConfig } from 'orval';

export default defineConfig({
  orderManager: {
    input: { target: './apps/api/openapi.json' },
    output: {
      mode: 'tags-split',
      target: './packages/api-client/src/generated/client.ts',
      schemas: './packages/api-client/src/generated/models',
      client: 'react-query',
      clean: true,
      override: { mutator: { path: './packages/api-client/src/http.ts', name: 'apiFetch' } },
    },
  },
});
