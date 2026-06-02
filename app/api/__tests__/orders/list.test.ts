import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestRequest, readResponse, mockAuthUser, mockNoAuth } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/orders', () => ({
  createOrder: vi.fn(),
  listOrders: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { listOrders } = await import('@/lib/services/orders');
const mockedListOrders = vi.mocked(listOrders);

const { GET } = await import('@/app/api/orders/route');

describe('GET /api/orders', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(mockSupabase);

    const request = createTestRequest('/api/orders');

    const response = await GET(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns orders with pagination', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedListOrders.mockResolvedValue({
      orders: [{ id: 'o1' }, { id: 'o2' }],
      total: 15,
    } as never);

    const request = createTestRequest('/api/orders', {
      searchParams: { page: '2', limit: '5' },
    });

    const response = await GET(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body.orders).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 15,
      totalPages: 3,
    });
    expect(mockedListOrders).toHaveBeenCalledWith('user-1', {
      page: 2,
      limit: 5,
      status: undefined,
    });
  });

  it('passes status filter when provided', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedListOrders.mockResolvedValue({ orders: [], total: 0 } as never);

    const request = createTestRequest('/api/orders', {
      searchParams: { status: 'delivered' },
    });

    await GET(request);

    expect(mockedListOrders).toHaveBeenCalledWith('user-1', {
      page: 1,
      limit: 10,
      status: 'delivered',
    });
  });

  it('clamps limit to maximum 50', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedListOrders.mockResolvedValue({ orders: [], total: 0 } as never);

    const request = createTestRequest('/api/orders', {
      searchParams: { limit: '200' },
    });

    await GET(request);

    expect(mockedListOrders).toHaveBeenCalledWith('user-1', {
      page: 1,
      limit: 50,
      status: undefined,
    });
  });

  it('returns 500 when service throws', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedListOrders.mockRejectedValue(new Error('DB error'));

    const request = createTestRequest('/api/orders');

    const response = await GET(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('DB error');
  });
});
