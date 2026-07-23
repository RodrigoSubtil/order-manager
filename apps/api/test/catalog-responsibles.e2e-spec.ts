import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { SupabaseAuthService } from '../src/auth/supabase-auth.service';
import { configureApplication } from '../src/bootstrap';
import { CatalogService } from '../src/catalog/catalog.service';
import { MembershipRole } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { TenantAccessService } from '../src/tenants/tenant-access.service';
import { UsersService } from '../src/users/users.service';

describe('Catalog HTTP authorization', () => {
  let app: INestApplication;
  const catalog = { list: jest.fn(), create: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SupabaseAuthService)
      .useValue({
        getUserFromAccessToken: jest
          .fn()
          .mockResolvedValue({ id: 'user-a', email: 'a@example.test', displayName: 'User A' }),
      })
      .overrideProvider(TenantAccessService)
      .useValue({
        resolveForUser: jest.fn().mockResolvedValue({
          membershipId: 'membership-a',
          tenantId: 'tenant-a',
          tenantSlug: 'alpha',
          role: MembershipRole.OPERATOR,
        }),
      })
      .overrideProvider(UsersService)
      .useValue({ synchronizeIdentity: jest.fn() })
      .overrideProvider(PrismaService)
      .useValue({ withTenantContext: jest.fn((_authentication, operation) => operation()) })
      .overrideProvider(CatalogService)
      .useValue(catalog)
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('allows listing through a verified session but blocks OPERATOR catalog administration', async () => {
    catalog.list.mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    await request(app.getHttpServer())
      .get('/api/v1/catalog/products')
      .set('Authorization', 'Bearer test')
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/catalog/products')
      .set('Authorization', 'Bearer test')
      .send({ name: 'Pastel', category: 'PASTELARIA' })
      .expect(403);
    expect(catalog.create).not.toHaveBeenCalled();
  });
});
