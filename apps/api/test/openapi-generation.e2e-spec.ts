import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { AppModule } from '../src/app.module';
import { configureApplication, createOpenApiDocument } from '../src/bootstrap';

describe('OpenAPI contract generation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('writes the versioned contract without connecting to external services', async () => {
    const document = createOpenApiDocument(app);
    await writeFile(
      resolve(process.cwd(), 'openapi.json'),
      `${JSON.stringify(document, null, 2)}\n`,
      'utf8',
    );

    expect(document.info.version).toBe('1.0');
    expect(document.paths).toHaveProperty('/api/v1/orders');
    expect(document.paths).toHaveProperty('/api/v1/reports/production-summary');

    const emptySchemas = Object.entries(document.components?.schemas ?? {})
      .filter(
        ([, schema]) =>
          'type' in schema &&
          schema.type === 'object' &&
          Object.keys(schema.properties ?? {}).length === 0,
      )
      .map(([name]) => name);
    expect(emptySchemas).toEqual([]);

    const successResponsesWithoutSchemas: string[] = [];
    for (const [path, pathItem] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem ?? {})) {
        if (!['get', 'post', 'patch', 'delete'].includes(method) || !operation) continue;
        const responses = (
          operation as {
            responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
          }
        ).responses;
        for (const [status, response] of Object.entries(responses ?? {})) {
          if (!status.startsWith('2') || status === '204') continue;
          if (!response.content?.['application/json']?.schema)
            successResponsesWithoutSchemas.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
    expect(successResponsesWithoutSchemas).toEqual([]);

    const orderListParameters = document.paths['/api/v1/orders']?.get?.parameters ?? [];
    expect(
      orderListParameters.map((parameter) => ('name' in parameter ? parameter.name : undefined)),
    ).toEqual(
      expect.arrayContaining([
        'from',
        'until',
        'category',
        'status',
        'search',
        'responsibleId',
        'page',
        'pageSize',
      ]),
    );
    expect(document.paths['/api/v1/orders']?.get?.responses?.['200']).toMatchObject({
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/PaginatedOrdersResponseDto' } },
      },
    });
  });
});
