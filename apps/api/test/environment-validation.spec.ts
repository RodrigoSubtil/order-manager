import { validateEnvironment } from '../src/config/environment.validation';

function productionEnvironment(overrides: Record<string, unknown> = {}) {
  return {
    NODE_ENV: 'production',
    API_CORS_ORIGINS: 'https://app.order-manager.test',
    API_SWAGGER_ENABLED: 'false',
    DATABASE_URL: 'postgresql://user:password@db.example.test:5432/order_manager',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'production-anon-key',
    SESSION_CONTEXT_SECRET: 'a'.repeat(48),
    ...overrides,
  };
}

describe('production environment validation', () => {
  it('accepts an explicit HTTPS-only production configuration', () => {
    expect(validateEnvironment(productionEnvironment())).toEqual(
      expect.objectContaining({
        NODE_ENV: 'production',
        API_SWAGGER_ENABLED: false,
      }),
    );
  });

  it.each([
    ['wildcard CORS', { API_CORS_ORIGINS: '*' }],
    ['mixed wildcard CORS', { API_CORS_ORIGINS: 'https://app.order-manager.test,*' }],
    ['HTTP CORS origin', { API_CORS_ORIGINS: 'http://app.order-manager.test' }],
    ['Swagger enabled', { API_SWAGGER_ENABLED: 'true' }],
    ['metrics without token', { METRICS_ENABLED: 'true' }],
    ['Sentry without DSN', { SENTRY_ENABLED: 'true' }],
    ['HTTP Supabase URL', { SUPABASE_URL: 'http://project.supabase.co' }],
    ['placeholder secret', { SUPABASE_ANON_KEY: 'replace-with-anon-key-only' }],
  ])('rejects %s in production', (_scenario, overrides) => {
    expect(() => validateEnvironment(productionEnvironment(overrides))).toThrow(
      /production|HTTPS|placeholder|required/i,
    );
  });
});

describe('staging environment validation', () => {
  it('applies the same HTTPS and Swagger controls as production', () => {
    expect(
      validateEnvironment(
        productionEnvironment({ NODE_ENV: 'staging', API_SWAGGER_ENABLED: 'false' }),
      ),
    ).toEqual(expect.objectContaining({ NODE_ENV: 'staging' }));

    expect(() =>
      validateEnvironment(
        productionEnvironment({ NODE_ENV: 'staging', API_SWAGGER_ENABLED: 'true' }),
      ),
    ).toThrow(/staging/i);
  });
});
