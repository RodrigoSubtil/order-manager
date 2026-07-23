import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_DATABASE_CONTEXT_KEY = 'skipTenantDatabaseContext';
export const SkipTenantDatabaseContext = () => SetMetadata(SKIP_TENANT_DATABASE_CONTEXT_KEY, true);
