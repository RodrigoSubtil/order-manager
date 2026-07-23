import { TenantsController } from '../src/tenants/tenants.controller';
import { MembershipRole } from '../src/generated/prisma/client';

describe('TenantsController', () => {
  it('lists team memberships only through the active tenant context', async () => {
    const memberships = {
      listForActiveTenant: jest.fn().mockResolvedValue([
        {
          id: 'membership-a',
          role: MembershipRole.OWNER,
          status: 'ACTIVE',
          tenant: { id: 'tenant-a', slug: 'alpha', name: 'Alpha' },
          user: { id: 'user-a', displayName: 'Owner', email: 'owner@example.test' },
        },
      ]),
    };
    const controller = new TenantsController(memberships as never, {} as never);
    const request = {
      authentication: {
        user: { id: 'user-a', email: 'owner@example.test', displayName: 'Owner' },
        tenant: {
          membershipId: 'membership-a',
          tenantId: 'tenant-a',
          tenantSlug: 'alpha',
          role: MembershipRole.OWNER,
        },
      },
    };

    await expect(controller.listCurrentTenantMemberships(request as never)).resolves.toEqual({
      items: expect.arrayContaining([expect.objectContaining({ id: 'membership-a' })]),
    });
    expect(memberships.listForActiveTenant).toHaveBeenCalledWith(request.authentication);
  });
});
