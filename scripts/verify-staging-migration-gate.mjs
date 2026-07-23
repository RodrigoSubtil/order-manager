const required = ['DATABASE_URL', 'BACKUP_REFERENCE', 'BACKUP_VERIFIED_AT'];
const missing = required.filter((name) => !process.env[name]?.trim());

if (process.env.MIGRATION_TARGET !== 'staging' || process.env.ALLOW_STAGING_MIGRATIONS !== 'true') {
  throw new Error(
    'Staging migrations require MIGRATION_TARGET=staging and ALLOW_STAGING_MIGRATIONS=true.',
  );
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('The staging migration gate refuses NODE_ENV=production.');
}

if (missing.length > 0) {
  throw new Error(`A verified backup is required before migration: missing ${missing.join(', ')}.`);
}

const verifiedAt = new Date(process.env.BACKUP_VERIFIED_AT);
if (Number.isNaN(verifiedAt.valueOf())) {
  throw new Error('BACKUP_VERIFIED_AT must be an ISO date-time.');
}

if (Date.now() - verifiedAt.valueOf() > 24 * 60 * 60 * 1000) {
  throw new Error('BACKUP_VERIFIED_AT must be less than 24 hours old.');
}

process.stdout.write(
  'Staging migration gate passed. Backup identifier intentionally not logged.\n',
);
