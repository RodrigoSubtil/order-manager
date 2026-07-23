import 'dotenv/config';

import { defineConfig } from 'prisma/config';

// This fallback is deliberately local-only. Runtime API configuration still
// requires DATABASE_URL, and commands that connect to the database validate it.
const localDevelopmentUrl =
  'postgresql://order_manager:order_manager@localhost:5432/order_manager_dev?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? localDevelopmentUrl,
  },
});
