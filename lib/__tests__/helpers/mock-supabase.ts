/**
 * Chainable Supabase client mock.
 *
 * Usage:
 *   const { mockSupabase, mockQuery } = createMockSupabase();
 *   mockQuery.resolves({ data: [...], error: null });
 *   // mockSupabase is now usable as a fake Supabase client
 */

export function createMockSupabase() {
  // The single control point for return values
  let queryReturn: { data: unknown; error: unknown; count?: number | null } = {
    data: null,
    error: null,
  };

  const mockQuery = {
    /** Set the value that the final chain method resolves to */
    resolves(val: {
      data: unknown;
      error: unknown;
      count?: number | null;
    }) {
      queryReturn = val;
    },
  };

  // Every chainable method returns itself so .from().select().eq().single() works
  const chainable: Record<string, unknown> = {};
  const chainMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'in',
    'is',
    'gt',
    'lt',
    'gte',
    'lte',
    'like',
    'ilike',
    'order',
    'limit',
    'range',
    'filter',
    'match',
    'not',
    'or',
    'contains',
    'textSearch',
  ];

  for (const method of chainMethods) {
    chainable[method] = vi.fn().mockImplementation(() => chainable);
  }

  // Terminal methods resolve the stored return value
  chainable.single = vi.fn().mockImplementation(() => Promise.resolve(queryReturn));
  chainable.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(queryReturn));
  // Make the chainable itself thenable so `await supabase.from(...).select(...)` works
  chainable.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(queryReturn).then(resolve, reject);

  const mockRpc = vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null }));

  const mockSupabase = {
    from: vi.fn().mockReturnValue(chainable),
    rpc: mockRpc,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };

  return { mockSupabase, mockQuery, mockRpc, chainable };
}
