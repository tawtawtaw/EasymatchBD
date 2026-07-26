import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

function resolveSecretKey() {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  );
}

function resolveBucket() {
  return (
    process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
    process.env.SUPABASE_BUCKET?.trim() ||
    null
  );
}

const url = process.env.SUPABASE_URL?.trim();
const secretKey = resolveSecretKey();
const bucket = resolveBucket();

console.log('STORAGE_BACKEND:', process.env.STORAGE_BACKEND ?? '(unset)');
console.log('SUPABASE_URL:', url ? 'set' : 'MISSING');
console.log('SUPABASE_SECRET_KEY:', secretKey ? 'set' : 'MISSING');
console.log('SUPABASE_STORAGE_BUCKET:', bucket ?? 'MISSING');

if (!url || !secretKey || !bucket) {
  console.error('\nCannot test Supabase Storage — set the missing variables above.');
  process.exit(1);
}

const client = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});

const { data, error } = await client.storage.from(bucket).list('', { limit: 20 });

if (error) {
  console.error('\nSupabase list failed:', error.message);
  process.exit(1);
}

console.log(`\nBucket "${bucket}" root listing (${data?.length ?? 0} entries):`);
for (const entry of data ?? []) {
  console.log(` - ${entry.name}${entry.id ? '' : ' (folder)'}`);
}

if ((data ?? []).length === 0) {
  console.log('\nBucket is empty at root level. Uploaded files live in user folders, e.g.:');
  console.log('  {userId}/photos/{uuid}.jpg');
}
