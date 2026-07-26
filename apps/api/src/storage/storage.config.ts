import type { ConfigService } from '@nestjs/config';
import type { StorageBackendKind } from './storage.types';
import { resolveSupabaseSecretKey } from './supabase-storage.backend';

export type ResolvedStorageConfig = {
  backend: StorageBackendKind;
  bucket: string | null;
  missingSupabase: string[];
};

export function resolveStorageBucket(config: ConfigService): string | null {
  return (
    config.get<string>('SUPABASE_STORAGE_BUCKET')?.trim() ||
    config.get<string>('SUPABASE_BUCKET')?.trim() ||
    null
  );
}

export function resolveStorageConfig(config: ConfigService): ResolvedStorageConfig {
  const configured = config.get<string>('STORAGE_BACKEND')?.trim().toLowerCase();
  const url = config.get<string>('SUPABASE_URL')?.trim() ?? null;
  const secretKey = resolveSupabaseSecretKey(
    config.get<string>('SUPABASE_SECRET_KEY'),
    config.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
  );
  const bucket = resolveStorageBucket(config);

  const missingSupabase: string[] = [];
  if (!url) missingSupabase.push('SUPABASE_URL');
  if (!secretKey) {
    missingSupabase.push('SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  }
  if (!bucket) {
    missingSupabase.push('SUPABASE_STORAGE_BUCKET (or SUPABASE_BUCKET)');
  }

  if (configured === 'local') {
    return { backend: 'local', bucket, missingSupabase };
  }

  if (configured === 'supabase' || (url && secretKey && bucket)) {
    if (missingSupabase.length === 0) {
      return { backend: 'supabase', bucket, missingSupabase: [] };
    }
    return { backend: 'local', bucket, missingSupabase };
  }

  return { backend: 'local', bucket, missingSupabase };
}
