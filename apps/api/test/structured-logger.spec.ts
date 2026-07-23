import { StructuredLogger } from '../src/common/logging/structured.logger';

describe('StructuredLogger privacy boundary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redacts PII and credentials from structured messages', () => {
    const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logger = new StructuredLogger();

    logger.log({
      clientName: 'Ana Silva',
      email: 'ana@example.test',
      phone: '+351 912 345 678',
      authorization: 'Bearer secret-token',
      nested: { refreshToken: 'refresh-secret' },
      traceId: '8dc7a2d8-941b-44cf-a6d8-629059928fe2',
    });

    const entry = JSON.parse(write.mock.calls[0]?.[0] as string) as {
      message: Record<string, unknown>;
    };
    expect(entry.message).toEqual({
      clientName: '[redacted]',
      email: '[redacted]',
      phone: '[redacted]',
      authorization: '[redacted]',
      nested: { refreshToken: '[redacted]' },
      traceId: '8dc7a2d8-941b-44cf-a6d8-629059928fe2',
    });
  });

  it('redacts PII from errors and does not emit a stack trace', () => {
    const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logger = new StructuredLogger();

    logger.error(new Error('Failed for ana@example.test and +351 912 345 678'));

    const entry = JSON.parse(write.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(entry.errorMessage).toBe('Failed for [redacted-email] and [redacted-phone]');
    expect(entry).not.toHaveProperty('errorStack');
  });
});
