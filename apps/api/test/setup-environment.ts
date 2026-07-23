process.env.DATABASE_URL ??=
  'postgresql://order_manager:order_manager@localhost:5432/order_manager_test?schema=public';
process.env.SUPABASE_URL ??= 'https://project.example.test';
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.SESSION_CONTEXT_SECRET ??= 'test-only-context-secret-at-least-32-characters';
process.env.TENANT_CONTEXT_TTL_SECONDS ??= '86400';
