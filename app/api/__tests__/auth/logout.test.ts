import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readResponse } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { POST } = await import('@/app/api/auth/logout/route');

describe('POST /api/auth/logout', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 200 and calls signOut', async () => {
    const response = await POST();
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('returns 500 when signOut throws', async () => {
    mockedCreateClient.mockRejectedValue(new Error('Connection failed'));

    const response = await POST();
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Logout failed');
  });
});
