import { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { Prisma, PrismaClient } from '../generated/prisma/client';
import type { RequestAuthentication } from '../common/auth/authenticated-request';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly requestTransaction = new AsyncLocalStorage<Prisma.TransactionClient>();
  private readonly securityContextRequired: boolean;

  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });

    super({ adapter });
    const environment = config.get<string>('NODE_ENV');
    this.securityContextRequired = environment === 'staging' || environment === 'production';
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async checkConnection(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }

  client(): Prisma.TransactionClient {
    const activeTransaction = this.requestTransaction.getStore();
    if (activeTransaction) return activeTransaction;
    if (this.securityContextRequired) {
      throw new Error('A verified database security context is required in production.');
    }
    return this as unknown as Prisma.TransactionClient;
  }

  async withIdentityContext<T>(userId: string, operation: () => Promise<T>): Promise<T> {
    return this.withSecurityContext(userId, undefined, operation);
  }

  async withTenantContext<T>(
    authentication: RequestAuthentication,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.withSecurityContext(
      authentication.user.id,
      authentication.tenant.tenantId,
      operation,
    );
  }

  async withTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const activeTransaction = this.requestTransaction.getStore();
    if (activeTransaction) return operation(activeTransaction);
    if (this.securityContextRequired) {
      throw new Error('A verified database security context is required in production.');
    }

    const maximumAttempts = 3;

    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      try {
        return await this.$transaction(operation, { isolationLevel: 'Serializable' });
      } catch (error) {
        const isRetryableWriteConflict =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';

        if (!isRetryableWriteConflict || attempt === maximumAttempts) {
          throw error;
        }
      }
    }

    throw new Error('Serializable transaction retry limit reached.');
  }

  private async withSecurityContext<T>(
    userId: string,
    tenantId: string | undefined,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (this.requestTransaction.getStore()) return operation();

    return this.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('SET LOCAL ROLE "order_manager_api"');
      await transaction.$queryRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
      await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId ?? ''}, true)`;
      return this.requestTransaction.run(transaction, operation);
    });
  }

  async reserveOrderNumber<T>(
    tenantId: string,
    operation: (tx: Prisma.TransactionClient, orderNumber: bigint) => Promise<T>,
  ): Promise<T> {
    if (!this.requestTransaction.getStore()) {
      return this.withTransaction(async (transaction) => {
        const tenant = await transaction.tenant.update({
          where: { id: tenantId },
          data: { nextOrderNumber: { increment: 1 } },
          select: { nextOrderNumber: true },
        });
        return operation(transaction, tenant.nextOrderNumber - BigInt(1));
      });
    }

    return this.withTransaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ order_number: bigint }>>`
        SELECT public.reserve_order_number(${tenantId}::uuid) AS order_number
      `;
      const orderNumber = rows[0]?.order_number;
      if (orderNumber === undefined) {
        throw new Error('The tenant order number could not be reserved.');
      }
      return operation(tx, orderNumber);
    });
  }
}
