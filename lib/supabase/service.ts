import { createClient } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-explicit-any */
let serviceClient: any = null;

/**
 * Creates a Supabase client using the service role key.
 * Bypasses RLS — use only in webhook handlers and server-side services
 * that don't have a user session (no cookies).
 *
 * Returns an untyped client since we don't have generated database types
 * for the service role context. All query results should be cast at call sites.
 */
export function createServiceClient(): any {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
  }

  serviceClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
