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

const { createOrder } = await import('@/lib/services/orders');
const mockedCreateOrder = vi.mocked(createOrder);

const { POST } = await import('@/app/api/orders/route');

function validOrderBody() {
  return {
    items: [
      { description: 'Brake pad', quantity: 2, price: 5000 },
    ],
    deliveryAddress: '123 Test Street, Ikeja, Lagos',
    paymentMethod: 'wallet' as const,
  };
}

describe('POST /api/orders', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(mockSupabase);

    const request = createTestRequest('/api/orders', {
      method: 'POST',
      body: validOrderBody(),
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 201 with order on valid input', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    const fakeOrder = { id: 'order-1', order_number: 'ORD-20240115-001', total: 13000 };
    mockedCreateOrder.mockResolvedValue(fakeOrder as never);

    const request = createTestRequest('/api/orders', {
      method: 'POST',
      body: validOrderBody(),
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(201);
    expect(body).toEqual(fakeOrder);
  });

  it('passes user.id as second argument to createOrder', async () => {
    mockAuthUser(mockSupabase, 'user-42');
    mockedCreateOrder.mockResolvedValue({ id: 'order-1' } as never);

    const request = createTestRequest('/api/orders', {
      method: 'POST',
      body: validOrderBody(),
    });

    await POST(request);

    expect(mockedCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        deliveryAddress: '123 Test Street, Ikeja, Lagos',
        paymentMethod: 'wallet',
      }),
      'user-42'
    );
  });

  it('returns 400 when items array is empty', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    const request = createTestRequest('/api/orders', {
      method: 'POST',
      body: { ...validOrderBody(), items: [] },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 when deliveryAddress is missing', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    const { deliveryAddress, ...body } = validOrderBody();
    const request = createTestRequest('/api/orders', {
      method: 'POST',
      body,
    });

    const response = await POST(request);
    const { status, body: respBody } = await readResponse(response);

    expect(status).toBe(400);
    expect(respBody.error).toBe('Validation failed');
  });

  it('returns 400 when paymentMethod is missing', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    const { paymentMethod, ...body } = validOrderBody();
    const request = createTestRequest('/api/orders', {
      method: 'POST',
      body,
    });

    const response = await POST(request);
    const { status, body: respBody } = await readResponse(response);

    expect(status).toBe(400);
    expect(respBody.error).toBe('Validation failed');
  });

  it('returns 400 when paymentMethod is invalid', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    const request = createTestRequest('/api/orders', {
      method: 'POST',
      body: { ...validOrderBody(), paymentMethod: 'bitcoin' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Validation failed');
  });

  it('defaults sourceChannel to web', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedCreateOrder.mockResolvedValue({ id: 'order-1' } as never);

    const request = createTestRequest('/api/orders', {
      method: 'POST',
      body: validOrderBody(),
    });

    await POST(request);

    expect(mockedCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ sourceChannel: 'web' }),
      'user-1'
    );
  });

  it('returns 500 when createOrder service throws', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedCreateOrder.mockRejectedValue(new Error('Insufficient wallet balance'));

    const request = createTestRequest('/api/orders', {
      method: 'POST',
      body: validOrderBody(),
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Insufficient wallet balance');
  });
});
