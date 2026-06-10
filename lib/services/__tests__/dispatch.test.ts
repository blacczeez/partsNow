import { createMockSupabase } from '@/lib/__tests__/helpers';
import { createServiceClient } from '@/lib/supabase/service';

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}));

const mockedCreateServiceClient = vi.mocked(createServiceClient);

// Helper: create a chainable that resolves with given data/error
// Supports both .single() and direct await (thenable)
function createChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'insert', 'update', 'eq', 'neq', 'in', 'is', 'gte', 'lte', 'order', 'range'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: unknown) => void, reject: (v: unknown) => void) =>
      Promise.resolve({ data, error, count: null }).then(resolve, reject),
  });
  return chain;
}

describe('assignRunner', () => {
  async function getModule() {
    return await import('../dispatch');
  }

  function setupMock() {
    const { mockSupabase, mockRpc } = createMockSupabase();
    mockedCreateServiceClient.mockReturnValue(mockSupabase);
    return { mockSupabase, mockRpc };
  }

  // Build a from() mock that routes by table name
  function routeByTable(
    mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'],
    routes: Record<string, ReturnType<typeof createChain>>
  ) {
    mockSupabase.from.mockImplementation((table: string) => {
      return routes[table] ?? createChain(null);
    });
  }

  it('selects the least-loaded runner and returns assignment id', async () => {
    const { mockSupabase } = setupMock();

    routeByTable(mockSupabase, {
      runner_shifts: createChain([{ runner_id: 'r1' }, { runner_id: 'r2' }]),
      users: createChain([{ id: 'r1' }, { id: 'r2' }]),
      runner_floats: createChain([{ runner_id: 'r1' }, { runner_id: 'r2' }]),
      order_assignments: createChain([
        { assignee_id: 'r1' },
        { assignee_id: 'r1' },
      ]),
    });

    // Override order_assignments for the insert call (second call to that table)
    let assignmentCallCount = 0;
    const originalFrom = mockSupabase.from.getMockImplementation()!;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'order_assignments') {
        assignmentCallCount++;
        if (assignmentCallCount === 1) {
          // Check for existing assignment on this order
          return createChain(null);
        }
        if (assignmentCallCount === 2) {
          // Count assignments per runner
          return createChain([{ assignee_id: 'r1' }, { assignee_id: 'r1' }]);
        }
        // Insert
        return createChain({ id: 'assignment-1' });
      }
      return originalFrom(table);
    });

    const { assignRunner } = await getModule();
    const result = await assignRunner('order-1', 'cluster-1');

    expect(result).toBe('assignment-1');
  });

  it('picks runner with fewer assignments (load balancing)', async () => {
    const { mockSupabase } = setupMock();

    let assignmentCallCount = 0;
    const insertChain = createChain({ id: 'assignment-lb' });

    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'runner_shifts':
          return createChain([{ runner_id: 'r1' }, { runner_id: 'r2' }]);
        case 'users':
          return createChain([{ id: 'r1' }, { id: 'r2' }]);
        case 'runner_floats':
          return createChain([{ runner_id: 'r1' }, { runner_id: 'r2' }]);
        case 'order_assignments':
          assignmentCallCount++;
          if (assignmentCallCount === 1) {
            return createChain(null);
          }
          if (assignmentCallCount === 2) {
            // r1 has 2 assignments, r2 has 0
            return createChain([{ assignee_id: 'r1' }, { assignee_id: 'r1' }]);
          }
          return insertChain;
        default:
          return createChain(null);
      }
    });

    const { assignRunner } = await getModule();
    await assignRunner('order-1', 'cluster-1');

    // The insert should be for r2 (fewer assignments)
    expect(insertChain.insert.mock.calls[0][0]).toEqual(
      expect.objectContaining({ assignee_id: 'r2', role: 'runner' })
    );
  });

  it('returns null when no active shifts exist', async () => {
    const { mockSupabase } = setupMock();

    routeByTable(mockSupabase, {
      runner_shifts: createChain([]),
    });

    const { assignRunner } = await getModule();
    const result = await assignRunner('order-1', 'cluster-1');
    expect(result).toBeNull();
  });

  it('returns null when runner_shifts data is null', async () => {
    const { mockSupabase } = setupMock();

    routeByTable(mockSupabase, {
      runner_shifts: createChain(null),
    });

    const { assignRunner } = await getModule();
    const result = await assignRunner('order-1', 'cluster-1');
    expect(result).toBeNull();
  });

  it('returns null when no active users match shift runners', async () => {
    const { mockSupabase } = setupMock();

    routeByTable(mockSupabase, {
      runner_shifts: createChain([{ runner_id: 'r1' }]),
      users: createChain([]), // No active users
    });

    const { assignRunner } = await getModule();
    const result = await assignRunner('order-1', 'cluster-1');
    expect(result).toBeNull();
  });

  it('returns null when no runners have sufficient float', async () => {
    const { mockSupabase } = setupMock();

    routeByTable(mockSupabase, {
      runner_shifts: createChain([{ runner_id: 'r1' }]),
      users: createChain([{ id: 'r1' }]),
      runner_floats: createChain([]), // No funded runners
    });

    const { assignRunner } = await getModule();
    const result = await assignRunner('order-1', 'cluster-1');
    expect(result).toBeNull();
  });

  it('returns null when all runners are at max concurrent orders', async () => {
    const { mockSupabase } = setupMock();

    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'runner_shifts':
          return createChain([{ runner_id: 'r1' }]);
        case 'users':
          return createChain([{ id: 'r1' }]);
        case 'runner_floats':
          return createChain([{ runner_id: 'r1' }]);
        case 'order_assignments':
          // r1 has 3 assignments (max is 3)
          return createChain([
            { assignee_id: 'r1' },
            { assignee_id: 'r1' },
            { assignee_id: 'r1' },
          ]);
        default:
          return createChain(null);
      }
    });

    const { assignRunner } = await getModule();
    const result = await assignRunner('order-1', 'cluster-1');
    expect(result).toBeNull();
  });

  it('returns null when assignment insert fails', async () => {
    const { mockSupabase } = setupMock();

    let assignmentCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'runner_shifts':
          return createChain([{ runner_id: 'r1' }]);
        case 'users':
          return createChain([{ id: 'r1' }]);
        case 'runner_floats':
          return createChain([{ runner_id: 'r1' }]);
        case 'order_assignments':
          assignmentCallCount++;
          if (assignmentCallCount === 1) return createChain(null);
          if (assignmentCallCount === 2) return createChain([]);
          // Insert fails
          return createChain(null, { message: 'Insert error' });
        default:
          return createChain(null);
      }
    });

    const { assignRunner } = await getModule();
    const result = await assignRunner('order-1', 'cluster-1');
    expect(result).toBeNull();
  });

  it('handles null assignments data gracefully', async () => {
    const { mockSupabase } = setupMock();

    let assignmentCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'runner_shifts':
          return createChain([{ runner_id: 'r1' }]);
        case 'users':
          return createChain([{ id: 'r1' }]);
        case 'runner_floats':
          return createChain([{ runner_id: 'r1' }]);
        case 'order_assignments':
          assignmentCallCount++;
          if (assignmentCallCount === 1) return createChain(null);
          if (assignmentCallCount === 2) return createChain(null);
          return createChain({ id: 'assignment-null' });
        default:
          return createChain(null);
      }
    });

    const { assignRunner } = await getModule();
    const result = await assignRunner('order-1', 'cluster-1');
    // Should still work — null assignments means 0 assignments for runner
    expect(result).toBe('assignment-null');
  });
});

describe('assignRider', () => {
  async function getModule() {
    return await import('../dispatch');
  }

  function setupMock() {
    const { mockSupabase, mockRpc } = createMockSupabase();
    mockedCreateServiceClient.mockReturnValue(mockSupabase);
    return { mockSupabase, mockRpc };
  }

  it('selects the least-loaded rider and returns assignment id', async () => {
    const { mockSupabase } = setupMock();

    let assignmentCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'users':
          return createChain([{ id: 'rider1' }, { id: 'rider2' }]);
        case 'order_assignments':
          assignmentCallCount++;
          if (assignmentCallCount === 1) {
            return createChain([{ assignee_id: 'rider1' }]);
          }
          return createChain({ id: 'rider-assignment-1' });
        default:
          return createChain(null);
      }
    });

    const { assignRider } = await getModule();
    const result = await assignRider('order-1', 'cluster-1');

    expect(result).toBe('rider-assignment-1');
  });

  it('picks rider with fewer assignments (load balancing)', async () => {
    const { mockSupabase } = setupMock();

    let assignmentCallCount = 0;
    const insertChain = createChain({ id: 'rider-lb' });

    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'users':
          return createChain([{ id: 'rider1' }, { id: 'rider2' }]);
        case 'order_assignments':
          assignmentCallCount++;
          if (assignmentCallCount === 1) {
            // rider1 has 2 assignments, rider2 has 0
            return createChain([{ assignee_id: 'rider1' }, { assignee_id: 'rider1' }]);
          }
          return insertChain;
        default:
          return createChain(null);
      }
    });

    const { assignRider } = await getModule();
    await assignRider('order-1', 'cluster-1');

    expect(insertChain.insert.mock.calls[0][0]).toEqual(
      expect.objectContaining({ assignee_id: 'rider2', role: 'rider' })
    );
  });

  it('returns null when no active riders in cluster', async () => {
    const { mockSupabase } = setupMock();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return createChain([]);
      return createChain(null);
    });

    const { assignRider } = await getModule();
    const result = await assignRider('order-1', 'cluster-1');
    expect(result).toBeNull();
  });

  it('returns null when riders data is null', async () => {
    const { mockSupabase } = setupMock();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return createChain(null);
      return createChain(null);
    });

    const { assignRider } = await getModule();
    const result = await assignRider('order-1', 'cluster-1');
    expect(result).toBeNull();
  });

  it('returns null when all riders are at max concurrent deliveries', async () => {
    const { mockSupabase } = setupMock();

    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'users':
          return createChain([{ id: 'rider1' }]);
        case 'order_assignments':
          return createChain([
            { assignee_id: 'rider1' },
            { assignee_id: 'rider1' },
            { assignee_id: 'rider1' },
          ]);
        default:
          return createChain(null);
      }
    });

    const { assignRider } = await getModule();
    const result = await assignRider('order-1', 'cluster-1');
    expect(result).toBeNull();
  });

  it('returns null when assignment insert fails', async () => {
    const { mockSupabase } = setupMock();

    let assignmentCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'users':
          return createChain([{ id: 'rider1' }]);
        case 'order_assignments':
          assignmentCallCount++;
          if (assignmentCallCount === 1) return createChain([]);
          return createChain(null, { message: 'Insert error' });
        default:
          return createChain(null);
      }
    });

    const { assignRider } = await getModule();
    const result = await assignRider('order-1', 'cluster-1');
    expect(result).toBeNull();
  });

  it('handles null assignments data gracefully', async () => {
    const { mockSupabase } = setupMock();

    let assignmentCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'users':
          return createChain([{ id: 'rider1' }]);
        case 'order_assignments':
          assignmentCallCount++;
          if (assignmentCallCount === 1) return createChain(null); // null
          return createChain({ id: 'rider-a-null' });
        default:
          return createChain(null);
      }
    });

    const { assignRider } = await getModule();
    const result = await assignRider('order-1', 'cluster-1');
    expect(result).toBe('rider-a-null');
  });

  it('creates assignment with correct role and status', async () => {
    const { mockSupabase } = setupMock();

    let assignmentCallCount = 0;
    const insertChain = createChain({ id: 'rider-correct' });

    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'users':
          return createChain([{ id: 'rider1' }]);
        case 'order_assignments':
          assignmentCallCount++;
          if (assignmentCallCount === 1) return createChain([]);
          return insertChain;
        default:
          return createChain(null);
      }
    });

    const { assignRider } = await getModule();
    await assignRider('order-99', 'cluster-1');

    expect(insertChain.insert.mock.calls[0][0]).toEqual({
      order_id: 'order-99',
      assignee_id: 'rider1',
      role: 'rider',
      status: 'assigned',
    });
  });
});
