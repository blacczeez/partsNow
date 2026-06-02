import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createTestRequest, readResponse } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { POST } = await import('@/app/api/auth/verify-otp/route');

describe('POST /api/auth/verify-otp', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 200 with user on valid phone+OTP', async () => {
    const fakeUser = { id: 'user-123', phone: '+2348012345678' };
    mockSupabase.auth.verifyOtp = vi.fn().mockResolvedValue({
      data: { user: fakeUser },
      error: null,
    });

    const request = createTestRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { phone: '08012345678', otp: '123456' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user).toEqual(fakeUser);
  });

  it('passes normalized phone and correct token/type to verifyOtp', async () => {
    mockSupabase.auth.verifyOtp = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const request = createTestRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { phone: '2348012345678', otp: '654321' },
    });

    await POST(request);

    expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
      phone: '+2348012345678',
      token: '654321',
      type: 'sms',
    });
  });

  it('returns 400 when phone is missing', async () => {
    const request = createTestRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { otp: '123456' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Invalid input');
  });

  it('returns 400 when OTP is wrong length', async () => {
    const request = createTestRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { phone: '08012345678', otp: '1234' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Invalid input');
  });

  it('returns 400 when OTP is missing', async () => {
    const request = createTestRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { phone: '08012345678' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Invalid input');
  });

  it('returns 400 when Supabase verifyOtp returns an error', async () => {
    mockSupabase.auth.verifyOtp = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid OTP' },
    });

    const request = createTestRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { phone: '08012345678', otp: '999999' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Invalid OTP');
  });

  it('returns 500 when request body is invalid JSON', async () => {
    const url = new URL('/api/auth/verify-otp', 'http://localhost:3000');
    const request = new NextRequest(url, {
      method: 'POST',
      body: 'bad-json',
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Verification failed');
  });
});
