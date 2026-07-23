import { apiFetch } from '@order-manager/api-client';
import { describe, expect, it } from 'vitest';

describe('browser API boundary', () => {
  it('rejects requests outside the versioned NestJS API', async () => {
    await expect(apiFetch({ url: '/rest/v1/orders', method: 'GET' })).rejects.toThrow(
      'Browser API requests must use the /api/v1 boundary',
    );
  });
});
