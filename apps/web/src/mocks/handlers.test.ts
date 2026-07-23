import type { HealthResponseDto } from '@order-manager/api-client';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { handlers } from './handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('typed MSW contract base', () => {
  it('serves a health response shaped by the generated API client type', async () => {
    const response = await fetch('http://localhost/api/v1/health');
    const payload: HealthResponseDto = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe('ok');
    expect(Date.parse(payload.timestamp)).not.toBeNaN();
  });
});
