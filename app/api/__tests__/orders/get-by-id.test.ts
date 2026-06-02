import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestRequest, readResponse, mockAuthUser, mockNoAuth, createRouteContext } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { GET } = await import('@/app/api/orders/[id]/route');

describe('GET /api/orders/[id]', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];
  let mockQuery: ReturnType<typeof createMockSupabase>['mockQuery'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockQuery = helpers.mockQuery;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(mockSupabase);

    const request = createTestRequest('/api/orders/order-1');
    const context = createRouteContext({ id: 'order-1' });

    const response = await GET(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when order not found', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({ data: null, error: { message: 'Not found' } });

    const request = createTestRequest('/api/orders/nonexistent');
    const context = createRouteContext({ id: 'nonexistent' });

    const response = await GET(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(404);
    expect(body.error).toBe('Order not found');
  });

  it('returns order with items and assignments on success', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    const fakeOrder = {
      id: 'order-1',
      order_number: 'ORD-20240115-001',
      total: 13000,
      order_items: [{ description: 'Brake pad' }],
      order_assignments: [],
      delivery_tracking: null,
    };
    mockQuery.resolves({ data: fakeOrder, error: null });

    const request = createTestRequest('/api/orders/order-1');
    const context = createRouteContext({ id: 'order-1' });

    const response = await GET(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body.order).toEqual(fakeOrder);
  });

  it('queries with customer_id filter for ownership', async () => {
    mockAuthUser(mockSupabase, 'user-99');
    mockQuery.resolves({ data: { id: 'order-1' }, error: null });

    const request = createTestRequest('/api/orders/order-1');
    const context = createRouteContext({ id: 'order-1' });

    await GET(request, context as never);

    expect(mockSupabase.from).toHaveBeenCalledWith('orders');
    const chainable = mockSupabase.from.mock.results[0].value;
    expect(chainable.eq).toHaveBeenCalledWith('id', 'order-1');
    expect(chainable.eq).toHaveBeenCalledWith('customer_id', 'user-99');
  });
});
