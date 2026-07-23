import { Request } from 'express';

import { MembershipRole } from '../../generated/prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  displayName: string;
};

export type TenantContext = {
  membershipId: string;
  tenantId: string;
  tenantSlug: string;
  tenantName?: string;
  role: MembershipRole;
};

export type RequestAuthentication = {
  user: AuthenticatedUser;
  tenant: TenantContext;
};

export type AuthenticatedRequest = Request & {
  identity?: AuthenticatedUser;
  authentication?: RequestAuthentication;
  requestId?: string;
};
