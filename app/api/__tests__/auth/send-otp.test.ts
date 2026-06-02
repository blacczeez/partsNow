import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createTestRequest, readResponse } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { POST } = await import('@/app/api/auth/send-otp/route');

describe('POST /api/auth/send-otp', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it('returns 200 and calls signInWithOtp with normalized phone', async () => {
    const request = createTestRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { phone: '08012345678' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
      phone: '+2348012345678',
    });
  });

  it('normalizes phone with country code prefix', async () => {
    const request = createTestRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { phone: '2348012345678' },
    });

    await POST(request);

    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
      phone: '+2348012345678',
    });
  });

  it('returns 400 for phone shorter than 10 characters', async () => {
    const request = createTestRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { phone: '08012' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Invalid phone number');
  });

  it('returns 400 for phone longer than 15 characters', async () => {
    const request = createTestRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { phone: '1234567890123456' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Invalid phone number');
  });

  it('returns 400 when phone is missing', async () => {
    const request = createTestRequest('/api/auth/send-otp', {
      method: 'POST',
      body: {},
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Invalid phone number');
  });

  it('returns 400 with error message when Supabase OTP fails', async () => {
    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      data: null,
      error: { message: 'Rate limit exceeded' },
    });

    const request = createTestRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { phone: '08012345678' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Rate limit exceeded');
  });

  it('returns 500 when request body is invalid JSON', async () => {
    const url = new URL('/api/auth/send-otp', 'http://localhost:3000');
    const request = new NextRequest(url, {
      method: 'POST',
      body: 'not json',
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Failed to send OTP');
  });
});
