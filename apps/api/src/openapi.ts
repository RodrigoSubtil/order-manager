import 'reflect-metadata';

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://order_manager:order_manager@localhost:5432/order_manager_test?schema=public';
process.env.SUPABASE_URL ??= 'https://project.example.test';
process.env.SUPABASE_ANON_KEY ??= 'contract-generation-anon-key';

async function main(): Promise<void> {
  console.log('Generating OpenAPI document.');
  const [{ AppModule }, { configureApplication, createOpenApiDocument }] = await Promise.all([
    import('./app.module'),
    import('./bootstrap'),
  ]);
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  configureApplication(app);
  try {
    const target = resolve(process.cwd(), 'openapi.json');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`, 'utf8');
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
