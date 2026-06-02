import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestRequest, readResponse, mockAuthUser, mockNoAuth, createRouteContext } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/wallet', () => ({
  creditWallet: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { creditWallet } = await import('@/lib/services/wallet');
const mockedCreditWallet = vi.mocked(creditWallet);

const { POST } = await import('@/app/api/orders/[id]/cancel/route');

describe('POST /api/orders/[id]/cancel', () => {
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

    const request = createTestRequest('/api/orders/order-1/cancel', {
      method: 'POST',
      body: {},
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

    const request = createTestRequest('/api/orders/order-1/cancel', {
      method: 'POST',
      body: {},
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(404);
    expect(body.error).toBe('Order not found');
  });

  it('returns 400 when order is in sourcing status', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'sourcing', payment_status: 'paid', payment_method: 'wallet', total: 13000, order_number: 'ORD-001' },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/cancel', {
      method: 'POST',
      body: {},
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Cannot cancel order in current status');
  });

  it('cancels successfully when order is pending', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    // First call: select order
    mockQuery.resolves({
      data: { id: 'order-1', status: 'pending', payment_status: 'pending', payment_method: 'wallet', total: 13000, order_number: 'ORD-001' },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/cancel', {
      method: 'POST',
      body: {},
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it('cancels successfully when order is confirmed', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'confirmed', payment_status: 'paid', payment_method: 'wallet', total: 13000, order_number: 'ORD-001' },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/cancel', {
      method: 'POST',
      body: {},
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it('calls creditWallet for refund when payment_status is paid and method is wallet', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'confirmed', payment_status: 'paid', payment_method: 'wallet', total: 13000, order_number: 'ORD-001' },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/cancel', {
      method: 'POST',
      body: {},
    });
    const context = createRouteContext({ id: 'order-1' });

    await POST(request, context as never);

    expect(mockedCreditWallet).toHaveBeenCalledWith(
      'user-1',
      13000,
      'order-1',
      'Refund for cancelled order ORD-001'
    );
  });

  it('does not call creditWallet for COD orders', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'pending', payment_status: 'pending', payment_method: 'cod', total: 13000, order_number: 'ORD-001' },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/cancel', {
      method: 'POST',
      body: {},
    });
    const context = createRouteContext({ id: 'order-1' });

    await POST(request, context as never);

    expect(mockedCreditWallet).not.toHaveBeenCalled();
  });

  it('stores reason in internal_notes when provided', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockQuery.resolves({
      data: { id: 'order-1', status: 'pending', payment_status: 'pending', payment_method: 'wallet', total: 13000, order_number: 'ORD-001' },
      error: null,
    });

    const request = createTestRequest('/api/orders/order-1/cancel', {
      method: 'POST',
      body: { reason: 'Found another supplier' },
    });
    const context = createRouteContext({ id: 'order-1' });

    await POST(request, context as never);

    // Verify update was called with reason in internal_notes
    expect(chainable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        internal_notes: 'Cancelled by customer: Found another supplier',
      })
    );
  });

  it('returns 500 when update fails', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    // Need to control sequential calls: first single() resolves with order,
    // then the update chain resolves with error
    let callCount = 0;
    (chainable.single as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          data: { id: 'order-1', status: 'pending', payment_status: 'pending', payment_method: 'wallet', total: 13000, order_number: 'ORD-001' },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Make the update chain resolve with error via then
    (chainable.then as unknown) = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: { message: 'Update failed' } });

    const request = createTestRequest('/api/orders/order-1/cancel', {
      method: 'POST',
      body: {},
    });
    const context = createRouteContext({ id: 'order-1' });

    const response = await POST(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Failed to cancel order');
  });
});
