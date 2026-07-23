import 'dotenv/config';

import { assertDevelopmentDatabase } from '../prisma/development-database';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for database integration tests.');
}

assertDevelopmentDatabase(databaseUrl);
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://project.example.test';
process.env.SUPABASE_ANON_KEY = 'database-test-anon-key';
process.env.SESSION_CONTEXT_SECRET = 'database-test-context-secret-at-least-32-characters';
process.env.TENANT_CONTEXT_TTL_SECONDS = '86400';
