import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestRequest, readResponse, mockAuthUser, mockNoAuth, createRouteContext } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { GET } = await import('@/app/api/orders/[id]/track/route');

describe('GET /api/orders/[id]/track', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(mockSupabase);

    const request = createTestRequest('/api/orders/order-1/track');
    const context = createRouteContext({ id: 'order-1' });

    const response = await GET(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when order not found', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    // All single() calls return not found
    (mockSupabase.from('').single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const request = createTestRequest('/api/orders/order-1/track');
    const context = createRouteContext({ id: 'order-1' });

    const response = await GET(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(404);
    expect(body.error).toBe('Order not found');
  });

  it('returns full tracking response with rider info', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++;
      const chain: Record<string, unknown> = {};
      const chainMethods = ['select', 'eq', 'order', 'limit', 'range', 'filter'];
      for (const method of chainMethods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }

      if (table === 'orders') {
        chain.single = vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'dispatched', customer_id: 'user-1' },
          error: null,
        });
      } else if (table === 'delivery_tracking') {
        chain.single = vi.fn().mockResolvedValue({
          data: {
            current_latitude: 6.5244,
            current_longitude: 3.3792,
            eta_minutes: 12,
            partner_tracking_url: 'https://track.kwik.delivery/abc',
          },
          error: null,
        });
      } else if (table === 'order_assignments') {
        chain.single = vi.fn().mockResolvedValue({
          data: { assignee_id: 'rider-1' },
          error: null,
        });
      } else if (table === 'users') {
        chain.single = vi.fn().mockResolvedValue({
          data: { full_name: 'Rider A', phone: '2348099999999' },
          error: null,
        });
      }
      return chain;
    });

    const request = createTestRequest('/api/orders/order-1/track');
    const context = createRouteContext({ id: 'order-1' });

    const response = await GET(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body.orderId).toBe('order-1');
    expect(body.status).toBe('dispatched');
    expect(body.tracking).toEqual({
      latitude: 6.5244,
      longitude: 3.3792,
      etaMinutes: 12,
      partnerTrackingUrl: 'https://track.kwik.delivery/abc',
    });
    expect(body.rider).toEqual({ full_name: 'Rider A', phone: '2348099999999' });
  });

  it('returns null tracking and rider when no tracking data exists', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    mockSupabase.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      const chainMethods = ['select', 'eq', 'order', 'limit', 'range', 'filter'];
      for (const method of chainMethods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }

      if (table === 'orders') {
        chain.single = vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'confirmed', customer_id: 'user-1' },
          error: null,
        });
      } else if (table === 'delivery_tracking') {
        chain.single = vi.fn().mockResolvedValue({
          data: null,
          error: null,
        });
      } else if (table === 'order_assignments') {
        chain.single = vi.fn().mockResolvedValue({
          data: null,
          error: null,
        });
      }
      return chain;
    });

    const request = createTestRequest('/api/orders/order-1/track');
    const context = createRouteContext({ id: 'order-1' });

    const response = await GET(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body.tracking).toBeNull();
    expect(body.rider).toBeNull();
  });

  it('returns null rider when assignment exists but no rider data', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    mockSupabase.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      const chainMethods = ['select', 'eq', 'order', 'limit', 'range', 'filter'];
      for (const method of chainMethods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }

      if (table === 'orders') {
        chain.single = vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'dispatched', customer_id: 'user-1' },
          error: null,
        });
      } else if (table === 'delivery_tracking') {
        chain.single = vi.fn().mockResolvedValue({
          data: null,
          error: null,
        });
      } else if (table === 'order_assignments') {
        chain.single = vi.fn().mockResolvedValue({
          data: { assignee_id: 'rider-1' },
          error: null,
        });
      } else if (table === 'users') {
        chain.single = vi.fn().mockResolvedValue({
          data: null,
          error: null,
        });
      }
      return chain;
    });

    const request = createTestRequest('/api/orders/order-1/track');
    const context = createRouteContext({ id: 'order-1' });

    const response = await GET(request, context as never);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body.rider).toBeNull();
  });
});
