import type {
  CatalogProductResponseDto,
  DetailedReportResponseDto,
  MembershipResponseDto,
  OrderResponseDto,
  PaginatedCatalogProductsResponseDto,
  PaginatedOrdersResponseDto,
  PaginatedResponsiblesResponseDto,
  ProductionSummaryResponseDto,
  ResponsibleResponseDto,
  SessionResponseDto,
  TenantMemberListResponseDto,
} from '@order-manager/api-client';
import { HttpResponse, http } from 'msw';

const session: SessionResponseDto = {
  user: { id: 'user-alpha', email: 'gestor@alpha.test', displayName: 'Gestor Alpha' },
  tenant: { id: 'tenant-alpha', slug: 'padaria-alpha' },
  role: 'OWNER',
  tenantSelectionRequired: false,
};
let catalog: CatalogProductResponseDto[] = [
  {
    id: 'catalog-cake',
    tenantId: 'tenant-alpha',
    category: 'PASTELARIA',
    name: 'Bolo de chocolate',
    defaultUnit: 'UN',
    isActive: true,
    position: 0,
    version: 1,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    deletedAt: null,
    createdById: 'user-alpha',
    updatedById: 'user-alpha',
    deletedById: null,
  },
];
let responsibles: ResponsibleResponseDto[] = [
  {
    id: 'responsible-maria',
    tenantId: 'tenant-alpha',
    name: 'Maria',
    isActive: true,
    position: 0,
    version: 1,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    deletedAt: null,
    createdById: 'user-alpha',
    updatedById: 'user-alpha',
    deletedById: null,
  },
];
const catalogSeed = catalog.map((item) => ({ ...item }));
const responsiblesSeed = responsibles.map((item) => ({ ...item }));
let authenticated = false;
let orders: OrderResponseDto[] = [];
let memberships: MembershipResponseDto[] = [
  {
    id: 'membership-alpha-owner',
    role: 'OWNER',
    status: 'ACTIVE',
    tenant: { id: 'tenant-alpha', slug: 'padaria-alpha', name: 'Padaria Alpha' },
  },
];
let membershipUsers: Record<string, { id: string; displayName: string; email: string }> = {
  'membership-alpha-owner': {
    id: 'user-alpha',
    displayName: 'Gestor Alpha',
    email: 'gestor@alpha.test',
  },
};

export function resetApiMockState() {
  authenticated = false;
  orders = [];
  catalog = catalogSeed.map((item) => ({ ...item }));
  responsibles = responsiblesSeed.map((item) => ({ ...item }));
  memberships = [
    {
      id: 'membership-alpha-owner',
      role: 'OWNER',
      status: 'ACTIVE',
      tenant: { id: 'tenant-alpha', slug: 'padaria-alpha', name: 'Padaria Alpha' },
    },
  ];
  membershipUsers = {
    'membership-alpha-owner': {
      id: 'user-alpha',
      displayName: 'Gestor Alpha',
      email: 'gestor@alpha.test',
    },
  };
}

function unauthorized() {
  return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Sessão inválida.' }, { status: 401 });
}

function requireSession() {
  return authenticated ? null : unauthorized();
}

export function createHealthResponse() {
  return { status: 'ok' as const, timestamp: new Date().toISOString() };
}

export const handlers = [
  http.get('*/api/v1/health', () => HttpResponse.json(createHealthResponse())),
  http.get('*/api/v1/auth/csrf', () =>
    HttpResponse.json(
      { csrfToken: 'mock-csrf-token' },
      { headers: { 'Set-Cookie': 'om_csrf_token=mock-csrf-token; Path=/api/v1' } },
    ),
  ),
  http.get('*/api/v1/auth/me', () => (authenticated ? HttpResponse.json(session) : unauthorized())),
  http.post('*/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === 'gestor@alpha.test' && body.password === 'segredo') {
      authenticated = true;
      return HttpResponse.json(session);
    }
    return HttpResponse.json(
      { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas.' },
      { status: 401 },
    );
  }),
  http.post('*/api/v1/auth/refresh', () => unauthorized()),
  http.post('*/api/v1/auth/password-recovery', () =>
    HttpResponse.json(
      { message: 'If the account exists, recovery instructions will be sent.' },
      { status: 202 },
    ),
  ),
  http.post('*/api/v1/auth/logout', () => {
    authenticated = false;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('*/api/v1/tenants/memberships', () => {
    const denied = requireSession();
    if (denied) return denied;
    return HttpResponse.json({ items: memberships, activeMembershipId: 'membership-alpha-owner' });
  }),
  http.get('*/api/v1/tenants/memberships/current-tenant', () => {
    const denied = requireSession();
    if (denied) return denied;
    const response: TenantMemberListResponseDto = {
      items: memberships.map((membership) => ({
        ...membership,
        user: membershipUsers[membership.id] ?? {
          id: `user-${membership.id}`,
          displayName: 'Utilizador sem nome',
          email: 'utilizador@alpha.test',
        },
      })),
    };
    return HttpResponse.json(response);
  }),
  http.post('*/api/v1/tenants/switch', async ({ request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const body = (await request.json()) as { membershipId: string };
    const membership = memberships.find(
      (item) => item.id === body.membershipId && item.status === 'ACTIVE',
    );
    if (!membership) {
      return HttpResponse.json(
        { code: 'MEMBERSHIP_NOT_FOUND', message: 'Membership not found.' },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      membershipId: membership.id,
      tenant: membership.tenant,
      role: membership.role,
    });
  }),
  http.post('*/api/v1/tenants/memberships/:membershipId/accept', ({ params }) => {
    const denied = requireSession();
    if (denied) return denied;
    memberships = memberships.map((membership) =>
      membership.id === params.membershipId ? { ...membership, status: 'ACTIVE' } : membership,
    );
    const membership = memberships.find((item) => item.id === params.membershipId);
    return membership
      ? HttpResponse.json(membership)
      : HttpResponse.json(
          { code: 'INVITATION_NOT_FOUND', message: 'Invitation not found.' },
          { status: 404 },
        );
  }),
  http.post('*/api/v1/tenants', async ({ request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const body = (await request.json()) as { name: string; slug: string };
    const membership: MembershipResponseDto = {
      id: `membership-${memberships.length + 1}`,
      role: 'OWNER',
      status: 'ACTIVE',
      tenant: { id: `tenant-${memberships.length + 1}`, name: body.name, slug: body.slug },
    };
    memberships = [...memberships, membership];
    return HttpResponse.json(membership, { status: 201 });
  }),
  http.post('*/api/v1/tenants/memberships/invite', async ({ request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const body = (await request.json()) as { email: string; role: MembershipResponseDto['role'] };
    const invited: MembershipResponseDto = {
      id: `membership-${memberships.length + 1}`,
      role: body.role,
      status: 'INVITED',
      tenant: { id: 'tenant-alpha', slug: 'padaria-alpha', name: 'Padaria Alpha' },
    };
    memberships = [...memberships, invited];
    membershipUsers[invited.id] = {
      id: `user-${memberships.length}`,
      displayName: body.email.split('@')[0] || 'Utilizador convidado',
      email: body.email,
    };
    return HttpResponse.json(invited, { status: 201 });
  }),
  http.patch('*/api/v1/tenants/memberships/:membershipId', async ({ params, request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const body = (await request.json()) as Partial<Pick<MembershipResponseDto, 'role' | 'status'>>;
    memberships = memberships.map((membership) =>
      membership.id === params.membershipId ? { ...membership, ...body } : membership,
    );
    const result = memberships.find((membership) => membership.id === params.membershipId);
    return result
      ? HttpResponse.json(result)
      : HttpResponse.json(
          { code: 'MEMBERSHIP_NOT_FOUND', message: 'Membership not found.' },
          { status: 404 },
        );
  }),
  http.get('*/api/v1/catalog/products', () => {
    const denied = requireSession();
    if (denied) return denied;
    return HttpResponse.json<PaginatedCatalogProductsResponseDto>({
      items: catalog,
      page: 1,
      pageSize: 100,
      total: catalog.length,
    });
  }),
  http.post('*/api/v1/catalog/products', async ({ request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const body = (await request.json()) as { name: string; category: string; defaultUnit: string };
    const created: CatalogProductResponseDto = {
      id: `catalog-${catalog.length + 1}`,
      tenantId: 'tenant-alpha',
      category: body.category as CatalogProductResponseDto['category'],
      name: body.name,
      defaultUnit: body.defaultUnit as CatalogProductResponseDto['defaultUnit'],
      isActive: true,
      position: catalog.length,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      createdById: 'user-alpha',
      updatedById: 'user-alpha',
      deletedById: null,
    };
    catalog.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch('*/api/v1/catalog/products/:id', async ({ params, request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const body = (await request.json()) as Partial<CatalogProductResponseDto>;
    const item = catalog.find((product) => product.id === params.id);
    if (!item)
      return HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found.' }, { status: 404 });
    Object.assign(item, body, { version: item.version + 1 });
    return HttpResponse.json(item);
  }),
  http.delete('*/api/v1/catalog/products/:id', ({ params }) => {
    const denied = requireSession();
    if (denied) return denied;
    const index = catalog.findIndex((item) => item.id === params.id);
    if (index >= 0) catalog.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('*/api/v1/responsibles', () => {
    const denied = requireSession();
    if (denied) return denied;
    return HttpResponse.json<PaginatedResponsiblesResponseDto>({
      items: responsibles,
      page: 1,
      pageSize: 100,
      total: responsibles.length,
    });
  }),
  http.post('*/api/v1/responsibles', async ({ request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const body = (await request.json()) as { name: string };
    const created: ResponsibleResponseDto = {
      id: `responsible-${responsibles.length + 1}`,
      tenantId: 'tenant-alpha',
      name: body.name,
      isActive: true,
      position: responsibles.length,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      createdById: 'user-alpha',
      updatedById: 'user-alpha',
      deletedById: null,
    };
    responsibles.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch('*/api/v1/responsibles/:id', async ({ params, request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const body = (await request.json()) as Partial<ResponsibleResponseDto>;
    const item = responsibles.find((responsible) => responsible.id === params.id);
    if (!item)
      return HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found.' }, { status: 404 });
    Object.assign(item, body, { version: item.version + 1 });
    return HttpResponse.json(item);
  }),
  http.delete('*/api/v1/responsibles/:id', ({ params }) => {
    const denied = requireSession();
    if (denied) return denied;
    const index = responsibles.findIndex((item) => item.id === params.id);
    if (index >= 0) responsibles.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('*/api/v1/orders', ({ request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const until = url.searchParams.get('until');
    const search = url.searchParams.get('search')?.toLowerCase();
    const items = orders.filter(
      (order) =>
        (!from || order.deliveryDate >= from) &&
        (!until || order.deliveryDate <= until) &&
        (!search ||
          `${order.clientName} ${order.phone ?? ''} ${order.responsibleName ?? ''}`
            .toLowerCase()
            .includes(search)),
    );
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 25);
    return HttpResponse.json<PaginatedOrdersResponseDto>({
      items: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: items.length,
    });
  }),
  http.post('*/api/v1/orders', async ({ request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const body = (await request.json()) as {
      clientName: string;
      phone?: string;
      responsibleId?: string;
      deliveryDate: string;
      deliveryTime?: string;
      items: OrderResponseDto['items'];
    };
    const responsible = responsibles.find((item) => item.id === body.responsibleId);
    const created: OrderResponseDto = {
      id: `order-${orders.length + 1}`,
      orderNumber: String(orders.length + 1),
      clientName: body.clientName,
      phone: body.phone ?? null,
      responsibleId: body.responsibleId ?? null,
      responsibleName: responsible?.name ?? null,
      deliveryDate: body.deliveryDate,
      deliveryTime: body.deliveryTime ?? null,
      version: 1,
      createdAt: '2026-07-22T10:00:00.000Z',
      updatedAt: '2026-07-22T10:00:00.000Z',
      items: body.items.map((item, position) => ({
        ...item,
        id: `item-${orders.length + 1}-${position + 1}`,
        catalogProductId: null,
        notes: item.notes ?? null,
        position,
      })),
    };
    orders = [...orders, created];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.delete('*/api/v1/orders/:id', ({ params }) => {
    const denied = requireSession();
    if (denied) return denied;
    orders = orders.filter((order) => order.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('*/api/v1/orders/bulk-delete/preview', () => {
    const denied = requireSession();
    if (denied) return denied;
    return HttpResponse.json({
      total: orders.length,
      preview: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        deliveryDate: order.deliveryDate,
      })),
      truncated: false,
    });
  }),
  http.post('*/api/v1/orders/bulk-delete/confirm', () => {
    const denied = requireSession();
    if (denied) return denied;
    const deleted = orders.length;
    orders = [];
    return HttpResponse.json({ deleted });
  }),
  http.get('*/api/v1/reports/detailed', () => {
    const denied = requireSession();
    if (denied) return denied;
    const response: DetailedReportResponseDto = {
      generatedAt: '2026-07-22T10:00:00.000Z',
      from: '2026-07-22',
      until: '2026-07-22',
      tenant: { id: 'tenant-alpha', slug: 'padaria-alpha' },
      format: 'DETAILED',
      orders: orders.map((order) => ({
        ...order,
        responsible: order.responsibleId
          ? { id: order.responsibleId, name: order.responsibleName ?? '' }
          : null,
      })),
    };
    return HttpResponse.json(response);
  }),
  http.get('*/api/v1/reports/production-summary', () => {
    const denied = requireSession();
    if (denied) return denied;
    const response: ProductionSummaryResponseDto = {
      generatedAt: '2026-07-22T10:00:00.000Z',
      from: '2026-07-22',
      until: '2026-07-22',
      tenant: { id: 'tenant-alpha', slug: 'padaria-alpha' },
      format: 'PRODUCTION_SUMMARY',
      orderCount: orders.length,
      groups: [],
    };
    return HttpResponse.json(response);
  }),
];
