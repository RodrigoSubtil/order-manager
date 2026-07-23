import { assertDevelopmentDatabase } from '../prisma/development-database';

describe('development database safety guard', () => {
  const developmentUrl =
    'postgresql://order_manager:order_manager@localhost:5432/order_manager_dev';

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('accepts the named local development database', () => {
    expect(() => assertDevelopmentDatabase(developmentUrl)).not.toThrow();
    expect(() =>
      assertDevelopmentDatabase(
        'postgresql://order_manager:order_manager@localhost:5432/order_manager_migration_test',
      ),
    ).not.toThrow();
  });

  it('rejects a non-local host', () => {
    expect(() =>
      assertDevelopmentDatabase('postgresql://user:pass@example.com:5432/order_manager_dev'),
    ).toThrow('localhost PostgreSQL URL');
  });

  it('rejects production and unexpected database names', () => {
    process.env.NODE_ENV = 'production';
    expect(() => assertDevelopmentDatabase(developmentUrl)).toThrow('blocked');
    delete process.env.NODE_ENV;
    expect(() =>
      assertDevelopmentDatabase('postgresql://user:pass@localhost:5432/other_database'),
    ).toThrow('Development database name');
  });
});
