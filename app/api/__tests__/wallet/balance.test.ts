import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readResponse, mockAuthUser, mockNoAuth } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/wallet', () => ({
  getWalletBalance: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { getWalletBalance } = await import('@/lib/services/wallet');
const mockedGetWalletBalance = vi.mocked(getWalletBalance);

const { GET } = await import('@/app/api/wallet/balance/route');

describe('GET /api/wallet/balance', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(mockSupabase);

    const response = await GET();
    const { status, body } = await readResponse(response);

    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns balance data on success', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedGetWalletBalance.mockResolvedValue({
      balance: 25000,
      heldBalance: 5000,
      currency: 'NGN',
    } as never);

    const response = await GET();
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ balance: 25000, heldBalance: 5000, currency: 'NGN' });
    expect(mockedGetWalletBalance).toHaveBeenCalledWith('user-1');
  });

  it('returns zeros when service returns null', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedGetWalletBalance.mockResolvedValue(null as never);

    const response = await GET();
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ balance: 0, heldBalance: 0, currency: 'NGN' });
  });

  it('returns 500 when service throws', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedGetWalletBalance.mockRejectedValue(new Error('DB connection failed'));

    const response = await GET();
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('DB connection failed');
  });
});
