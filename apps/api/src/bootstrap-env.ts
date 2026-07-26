import { Logger } from '@nestjs/common';

const PRODUCTION_REQUIRED = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'CORS_ORIGIN',
] as const;

const PRODUCTION_OPTIONAL = [
  'DIRECT_URL',
  'WEB_PUBLIC_URL',
  'STORAGE_BACKEND',
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_STORAGE_BUCKET',
  'SUPABASE_BUCKET',
  'UPLOAD_DIR',
] as const;

export function logBootstrapEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  Logger.log(
    `Environment: NODE_ENV=${process.env.NODE_ENV ?? '(unset)'} PORT=${process.env.PORT ?? '(unset)'}`,
    'Bootstrap',
  );

  for (const key of PRODUCTION_REQUIRED) {
    Logger.log(`${key}: ${process.env[key]?.trim() ? 'set' : 'MISSING'}`, 'Bootstrap');
  }

  if (isProduction) {
    for (const key of PRODUCTION_OPTIONAL) {
      Logger.log(`${key}: ${process.env[key]?.trim() ? 'set' : 'unset'}`, 'Bootstrap');
    }
  }
}

export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const missing = PRODUCTION_REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length === 0) {
    return;
  }

  throw new Error(
    `Missing required Railway API variables: ${missing.join(', ')}. Open Railway → API service → Variables and restore them.`,
  );
}
