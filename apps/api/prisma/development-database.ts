export function assertDevelopmentDatabase(databaseUrl: string): void {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, '');
  const allowedHosts = new Set(['localhost', '127.0.0.1', '::1']);

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development database commands are blocked when NODE_ENV is production.');
  }

  if (!allowedHosts.has(url.hostname)) {
    throw new Error('Development database commands require a localhost PostgreSQL URL.');
  }

  if (!/^order_manager_(dev|test|migration_test)$/.test(databaseName)) {
    throw new Error(
      'Development database name must be order_manager_dev, order_manager_test or order_manager_migration_test.',
    );
  }
}
