import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestRequest, readResponse, mockAuthUser, mockNoAuth } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/wallet', () => ({
  initiateTopUp: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { initiateTopUp } = await import('@/lib/services/wallet');
const mockedInitiateTopUp = vi.mocked(initiateTopUp);

const { POST } = await import('@/app/api/wallet/topup/route');

describe('POST /api/wallet/topup', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(mockSupabase);

    const request = createTestRequest('/api/wallet/topup', {
      method: 'POST',
      body: { amount: 10000 },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns authorizationUrl and reference on valid amount', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedInitiateTopUp.mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/abc123',
      reference: 'ref_123',
    } as never);

    const request = createTestRequest('/api/wallet/topup', {
      method: 'POST',
      body: { amount: 10000 },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body.authorizationUrl).toBe('https://checkout.paystack.com/abc123');
    expect(body.reference).toBe('ref_123');
    expect(mockedInitiateTopUp).toHaveBeenCalledWith('user-1', 10000);
  });

  it('returns 400 when amount is below minimum (5000)', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    const request = createTestRequest('/api/wallet/topup', {
      method: 'POST',
      body: { amount: 4999 },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 when amount exceeds maximum (500000)', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    const request = createTestRequest('/api/wallet/topup', {
      method: 'POST',
      body: { amount: 500001 },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 when amount is missing', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    const request = createTestRequest('/api/wallet/topup', {
      method: 'POST',
      body: {},
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Validation failed');
  });

  it('returns 500 when service throws', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedInitiateTopUp.mockRejectedValue(new Error('Paystack unavailable'));

    const request = createTestRequest('/api/wallet/topup', {
      method: 'POST',
      body: { amount: 10000 },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Paystack unavailable');
  });
});
