import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestRequest, readResponse, mockAuthUser, mockNoAuth } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/wallet', () => ({
  getTransactions: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { getTransactions } = await import('@/lib/services/wallet');
const mockedGetTransactions = vi.mocked(getTransactions);

const { GET } = await import('@/app/api/wallet/transactions/route');

describe('GET /api/wallet/transactions', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(mockSupabase);

    const request = createTestRequest('/api/wallet/transactions');

    const response = await GET(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns transactions with pagination', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedGetTransactions.mockResolvedValue({
      transactions: [{ id: 'tx-1', amount: 5000, kind: 'topup', order: null }],
      total: 25,
      summary: {
        moneyIn: 5000,
        moneyOut: 0,
        periodLabel: 'June 2026',
        filter: 'all',
      },
    } as never);

    const request = createTestRequest('/api/wallet/transactions', {
      searchParams: { page: '2', limit: '5', filter: 'topups' },
    });

    const response = await GET(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body.transactions).toHaveLength(1);
    expect(body.summary.moneyIn).toBe(5000);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 25,
      totalPages: 5,
    });
    expect(mockedGetTransactions).toHaveBeenCalledWith('user-1', 2, 5, 'topups');
  });

  it('clamps limit to maximum 50', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedGetTransactions.mockResolvedValue({
      transactions: [],
      total: 0,
      summary: { moneyIn: 0, moneyOut: 0, periodLabel: 'June 2026', filter: 'all' },
    } as never);

    const request = createTestRequest('/api/wallet/transactions', {
      searchParams: { limit: '100' },
    });

    const response = await GET(request);
    const { body } = await readResponse(response);

    expect(body.pagination.limit).toBe(50);
    expect(mockedGetTransactions).toHaveBeenCalledWith('user-1', 1, 50, 'all');
  });

  it('defaults to page 1, limit 10', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedGetTransactions.mockResolvedValue({
      transactions: [],
      total: 0,
      summary: { moneyIn: 0, moneyOut: 0, periodLabel: 'June 2026', filter: 'all' },
    } as never);

    const request = createTestRequest('/api/wallet/transactions');

    await GET(request);

    expect(mockedGetTransactions).toHaveBeenCalledWith('user-1', 1, 10, 'all');
  });

  it('returns 500 when service throws', async () => {
    mockAuthUser(mockSupabase, 'user-1');
    mockedGetTransactions.mockRejectedValue(new Error('Query failed'));

    const request = createTestRequest('/api/wallet/transactions');

    const response = await GET(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Query failed');
  });
});
