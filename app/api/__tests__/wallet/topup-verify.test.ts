import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestRequest, readResponse, mockAuthUser, mockNoAuth } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/wallet', () => ({
  verifyAndCreditTopUp: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { verifyAndCreditTopUp } = await import('@/lib/services/wallet');
const mockedVerifyAndCreditTopUp = vi.mocked(verifyAndCreditTopUp);

const { POST } = await import('@/app/api/wallet/topup/verify/route');

describe('POST /api/wallet/topup/verify', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(mockSupabase);

    const request = createTestRequest('/api/wallet/topup/verify', {
      method: 'POST',
      body: { reference: 'ref_123' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when reference is missing', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    const request = createTestRequest('/api/wallet/topup/verify', {
      method: 'POST',
      body: {},
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Reference is required');
  });

  it('returns 400 when reference is not a string', async () => {
    mockAuthUser(mockSupabase, 'user-1');

    const request = createTestRequest('/api/wallet/topup/verify', {
      method: 'POST',
      body: { reference: 12345 },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Reference is required');
  });

  it('returns 400 when service returns success: false', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedVerifyAndCreditTopUp.mockResolvedValue({
      success: false,
    } as never);

    const request = createTestRequest('/api/wallet/topup/verify', {
      method: 'POST',
      body: { reference: 'ref_failed' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Payment verification failed');
  });

  it('returns 200 with amount and newBalance on success', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedVerifyAndCreditTopUp.mockResolvedValue({
      success: true,
      amount: 10000,
      newBalance: 35000,
    } as never);

    const request = createTestRequest('/api/wallet/topup/verify', {
      method: 'POST',
      body: { reference: 'ref_success' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ success: true, amount: 10000, newBalance: 35000 });
    expect(mockedVerifyAndCreditTopUp).toHaveBeenCalledWith('user-1', 'ref_success');
  });

  it('returns 500 when service throws', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedVerifyAndCreditTopUp.mockRejectedValue(new Error('Network timeout'));

    const request = createTestRequest('/api/wallet/topup/verify', {
      method: 'POST',
      body: { reference: 'ref_error' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Network timeout');
  });
});
