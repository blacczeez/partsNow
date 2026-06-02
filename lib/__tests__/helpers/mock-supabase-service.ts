import { createMockSupabase } from './mock-supabase';

/**
 * Sets up a vi.mock for `@/lib/supabase/server` so that
 * `createClient()` returns the mock Supabase client.
 *
 * Call this at the top of your test file (before imports are resolved):
 *
 *   vi.mock('@/lib/supabase/server', () => ({
 *     createClient: vi.fn(),
 *   }));
 *
 * Then inside tests, configure via the returned helpers.
 */
export function setupMockSupabase() {
  const helpers = createMockSupabase();

  // Dynamically import the mock and set the return value
  const { createClient } = require('@/lib/supabase/server') as {
    createClient: ReturnType<typeof vi.fn>;
  };

  createClient.mockResolvedValue(helpers.mockSupabase);

  return helpers;
}
