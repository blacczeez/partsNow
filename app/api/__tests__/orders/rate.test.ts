import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestRequest, readResponse, mockAuthUser, mockNoAuth, createRouteContext } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { POST } = await import('@/app/api/orders/[id]/rate/route');

describe('POST /api/orders/[id]/rate', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];
  let mockQuery: ReturnType<typeof createMockSupabase>['mockQuery'];
  let chainable: ReturnType<typeof createMockSupabase>['chainable'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockQuery = helpers.mockQuery;
    chainable = helpers.chainable;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(mockSupabase);

    const request = createTestRequest('/api/orders/order-1/rate', {
      method: 'POST',
      body: { rating: 5 },
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when order not found', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({ data: null, error: { message: 'Not found' } });

    const request = createTestRequest('/api/orders/order-1/rate', {
      method: 'POST',
      body: { rating: 5 },
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(404);
    expect(body.error).toBe('Order not found');
  });

  it('returns 400 when order is not delivered', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'dispatched', rating: null },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/rate', {
      method: 'POST',
      body: { rating: 5 },
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Can only rate delivered orders');
  });

  it('returns 400 when order already rated', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'delivered', rating: 4 },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/rate', {
      method: 'POST',
      body: { rating: 5 },
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Order already rated');
  });

  it('returns 200 on valid rating (1-5)', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'delivered', rating: null },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/rate', {
      method: 'POST',
      body: { rating: 4, comment: 'Great service' },
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(chainable.update).toHaveBeenCalledWith({
      rating: 4,
      rating_comment: 'Great service',
    });
  });

  it('returns 400 when rating is below 1', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'delivered', rating: null },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/rate', {
      method: 'POST',
      body: { rating: 0 },
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 when rating is above 5', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'delivered', rating: null },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/rate', {
      method: 'POST',
      body: { rating: 6 },
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Validation failed');
  });

  it('sets rating_comment to null when comment is not provided', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'delivered', rating: null },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/rate', {
      method: 'POST',
      body: { rating: 5 },
    });
    const context = createRouteContext({ id: 'order-1' });

    await POST(request, context as never);

    expect(chainable.update).toHaveBeenCalledWith({
      rating: 5,
      rating_comment: null,
    });
  });

  it('returns 500 when update fails', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    let callCount = 0;
    (chainable.single as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          data: { id: 'order-1', status: 'delivered', rating: null },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Make the update chain resolve with error
    (chainable.then as unknown) = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: { message: 'Update failed' } });

    const request = createTestRequest('/api/orders/order-1/rate', {
      method: 'POST',
      body: { rating: 5 },
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Failed to submit rating');
  });
});
