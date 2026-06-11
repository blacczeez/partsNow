import { createClient } from '@supabase/supabase-js';
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from '@/lib/supabase/env';

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

  serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
