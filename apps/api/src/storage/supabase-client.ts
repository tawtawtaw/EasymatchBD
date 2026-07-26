import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Server-side Supabase client (Storage/API). Node 20 needs an explicit WebSocket transport. */
export function createSupabaseServerClient(
  url: string,
  secretKey: string,
): SupabaseClient {
  // Supabase initializes Realtime even for Storage-only usage.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const WebSocketTransport = require('ws') as typeof globalThis.WebSocket;

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: WebSocketTransport,
    },
  });
}
