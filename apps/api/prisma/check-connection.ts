import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import { assertDevelopmentDatabase } from './development-database';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for the development connection check.');
  }

  assertDevelopmentDatabase(databaseUrl);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Development PostgreSQL connection is available.');
  } finally {
    await prisma.$disconnect();
  }
}

void main();
