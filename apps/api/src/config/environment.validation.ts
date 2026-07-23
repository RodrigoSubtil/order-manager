import Joi from 'joi';

const supportedNodeEnvironments = ['development', 'test', 'staging', 'production'] as const;
const placeholderPattern = /replace-with|your-project|example\.test|contract-generation/i;

const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...supportedNodeEnvironments)
    .default('development'),
  API_HOST: Joi.string().hostname().default('0.0.0.0'),
  API_PORT: Joi.number().port().default(3000),
  API_CORS_ORIGINS: Joi.string().trim().min(1).default('http://localhost:5173'),
  API_RATE_LIMIT_TTL_MS: Joi.number().integer().min(1000).max(3_600_000).default(60_000),
  API_RATE_LIMIT_LIMIT: Joi.number().integer().min(1).max(10_000).default(100),
  API_SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  METRICS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  METRICS_AUTH_TOKEN: Joi.string().min(32).optional().empty(''),
  SENTRY_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  SENTRY_DSN: Joi.string()
    .uri({ scheme: ['https'] })
    .optional()
    .empty(''),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0.05),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  SUPABASE_URL: Joi.string()
    .uri({ scheme: ['https', 'http'] })
    .required(),
  SUPABASE_ANON_KEY: Joi.string().trim().min(1).required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().trim().min(1).optional().empty(''),
  SUPABASE_INVITE_REDIRECT_URL: Joi.string()
    .uri({ scheme: ['https', 'http'] })
    .optional()
    .empty(''),
  SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL: Joi.string()
    .uri({ scheme: ['https', 'http'] })
    .optional()
    .empty(''),
  SESSION_CONTEXT_SECRET: Joi.string().min(32).required(),
  TENANT_CONTEXT_TTL_SECONDS: Joi.number().integer().min(300).max(2_592_000).default(86_400),
}).unknown(true);

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const { error, value } = environmentSchema.validate(config, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    throw new Error(`Invalid API environment configuration: ${error.message}`);
  }

  if (value.NODE_ENV === 'staging' || value.NODE_ENV === 'production') {
    const origins = value.API_CORS_ORIGINS.split(',').map((origin: string) => origin.trim());
    if (origins.includes('*')) {
      throw new Error('API_CORS_ORIGINS cannot contain "*" in staging or production.');
    }

    if (
      origins.some((origin: string) => {
        try {
          return new URL(origin).protocol !== 'https:';
        } catch {
          return true;
        }
      })
    ) {
      throw new Error(
        'API_CORS_ORIGINS must contain only explicit HTTPS origins in staging or production.',
      );
    }

    if (value.API_SWAGGER_ENABLED) {
      throw new Error('API_SWAGGER_ENABLED must be false in staging or production.');
    }

    if (value.METRICS_ENABLED && !value.METRICS_AUTH_TOKEN) {
      throw new Error('METRICS_AUTH_TOKEN is required when metrics are enabled.');
    }

    if (value.SENTRY_ENABLED && !value.SENTRY_DSN) {
      throw new Error('SENTRY_DSN is required when Sentry is enabled.');
    }

    if (new URL(value.SUPABASE_URL).protocol !== 'https:') {
      throw new Error('SUPABASE_URL must use HTTPS in staging or production.');
    }

    if (
      value.SUPABASE_INVITE_REDIRECT_URL &&
      new URL(value.SUPABASE_INVITE_REDIRECT_URL).protocol !== 'https:'
    ) {
      throw new Error('SUPABASE_INVITE_REDIRECT_URL must use HTTPS in staging or production.');
    }

    if (
      value.SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL &&
      new URL(value.SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL).protocol !== 'https:'
    ) {
      throw new Error(
        'SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL must use HTTPS in staging or production.',
      );
    }

    const protectedValues = [
      value.SUPABASE_ANON_KEY,
      value.SUPABASE_SERVICE_ROLE_KEY,
      value.SESSION_CONTEXT_SECRET,
    ].filter(Boolean) as string[];
    if (protectedValues.some((secret) => placeholderPattern.test(secret))) {
      throw new Error('Staging and production secrets cannot use example or placeholder values.');
    }
  }

  return value;
}
