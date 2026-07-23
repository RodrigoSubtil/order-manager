import { ServiceUnavailableException } from '@nestjs/common';

import { HealthController } from '../src/health/health.controller';

describe('HealthController readiness', () => {
  it('returns ready after a database ping', async () => {
    const prisma = { checkConnection: jest.fn().mockResolvedValue(undefined) };
    const observability = { recordIntegrationFailure: jest.fn() };
    const controller = new HealthController(prisma as never, observability as never);

    await expect(controller.getReadiness()).resolves.toEqual({
      status: 'ok',
      timestamp: expect.any(String),
    });
    expect(prisma.checkConnection).toHaveBeenCalledTimes(1);
  });

  it('reports database unavailability without exposing connection data', async () => {
    const prisma = {
      checkConnection: jest.fn().mockRejectedValue(new Error('postgres://secret@host')),
    };
    const observability = { recordIntegrationFailure: jest.fn() };
    const controller = new HealthController(prisma as never, observability as never);

    await expect(controller.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(observability.recordIntegrationFailure).toHaveBeenCalledWith('database');
  });
});
