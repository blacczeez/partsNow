import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { readResponse } from '../helpers';
import { createMockSupabase } from '@/lib/__tests__/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/integrations/paystack', () => ({
  verifyWebhookSignature: vi.fn(),
}));

vi.mock('@/lib/services/dispatch', () => ({
  assignRunner: vi.fn(),
}));

vi.mock('@/lib/services/notifications', () => ({
  notifyWalletTopUp: vi.fn().mockResolvedValue(undefined),
  notifyOrderConfirmed: vi.fn().mockResolvedValue(undefined),
}));

const { createClient } = await import('@/lib/supabase/server');
const mockedCreateClient = vi.mocked(createClient);

const { verifyWebhookSignature } = await import('@/lib/integrations/paystack');
const mockedVerifySignature = vi.mocked(verifyWebhookSignature);

const { assignRunner } = await import('@/lib/services/dispatch');
const mockedAssignRunner = vi.mocked(assignRunner);

const { notifyWalletTopUp, notifyOrderConfirmed } = await import('@/lib/services/notifications');
const mockedNotifyWalletTopUp = vi.mocked(notifyWalletTopUp);
const mockedNotifyOrderConfirmed = vi.mocked(notifyOrderConfirmed);

const { POST } = await import('@/app/api/webhooks/paystack/route');

function createWebhookRequest(payload: unknown, signature = 'valid-sig') {
  const body = JSON.stringify(payload);
  const url = new URL('/api/webhooks/paystack', 'http://localhost:3000');
  return new NextRequest(url, {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'x-paystack-signature': signature,
    },
  });
}

describe('POST /api/webhooks/paystack', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'];
  let mockRpc: ReturnType<typeof createMockSupabase>['mockRpc'];

  beforeEach(() => {
    vi.clearAllMocks();
    const helpers = createMockSupabase();
    mockSupabase = helpers.mockSupabase;
    mockRpc = helpers.mockRpc;
    mockedCreateClient.mockResolvedValue(mockSupabase as never);
    mockedVerifySignature.mockReturnValue(true);
  });

  it('returns 401 when signature is invalid', async () => {
    mockedVerifySignature.mockReturnValue(false);

    const request = createWebhookRequest(
      { event: 'charge.success', data: {} },
      'bad-signature'
    );

    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(401);
    expect(body.error).toBe('Invalid signature');
  });

  it('returns 401 when signature header is missing', async () => {
    mockedVerifySignature.mockReturnValue(false);

    const url = new URL('/api/webhooks/paystack', 'http://localhost:3000');
    const request = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({ event: 'charge.success', data: {} }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const { status } = await readResponse(response);

    expect(status).toBe(401);
  });

  it('credits wallet on charge.success with wallet_topup metadata', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      const chainMethods = ['select', 'eq', 'insert', 'update', 'order', 'limit', 'range'];
      for (const method of chainMethods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockResolvedValue({
        data: table === 'wallets' ? { id: 'wallet-1', balance: 25000 } : null,
        error: null,
      });
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null });
      return chain;
    });

    const payload = {
      event: 'charge.success',
      data: {
        reference: 'ref_abc123',
        amount: 1000000, // 10000 Naira in kobo
        metadata: { type: 'wallet_topup', user_id: 'user-1' },
      },
    };

    const request = createWebhookRequest(payload);
    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ received: true });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('credit_wallet', {
      p_wallet_id: 'wallet-1',
      p_amount: 10000, // amount / 100
      p_reference: 'ref_abc123',
      p_description: 'Wallet top-up via Paystack',
      p_metadata: { kind: 'topup', source: 'paystack' },
    });
  });

  it('converts amount from kobo to naira (divides by 100)', async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const chainMethods = ['select', 'eq', 'insert', 'update', 'order', 'limit', 'range'];
      for (const method of chainMethods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockResolvedValue({
        data: { id: 'wallet-1', balance: 50000 },
        error: null,
      });
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null });
      return chain;
    });

    const payload = {
      event: 'charge.success',
      data: {
        reference: 'ref_xyz',
        amount: 5000000, // 50000 Naira
        metadata: { type: 'wallet_topup', user_id: 'user-1' },
      },
    };

    const request = createWebhookRequest(payload);
    await POST(request);

    expect(mockSupabase.rpc).toHaveBeenCalledWith('credit_wallet', expect.objectContaining({
      p_amount: 50000,
    }));
  });

  it('inserts payment_event for wallet_topup', async () => {
    let insertedTable = '';
    let insertedData: unknown = null;

    mockSupabase.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      const chainMethods = ['select', 'eq', 'update', 'order', 'limit', 'range'];
      for (const method of chainMethods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockResolvedValue({
        data: { id: 'wallet-1', balance: 25000 },
        error: null,
      });
      chain.insert = vi.fn().mockImplementation((data) => {
        if (table === 'payment_events') {
          insertedTable = table;
          insertedData = data;
        }
        return chain;
      });
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null });
      return chain;
    });

    const payload = {
      event: 'charge.success',
      data: {
        reference: 'ref_123',
        amount: 1000000,
        metadata: { type: 'wallet_topup', user_id: 'user-1' },
      },
    };

    const request = createWebhookRequest(payload);
    await POST(request);

    expect(insertedTable).toBe('payment_events');
    expect(insertedData).toEqual(expect.objectContaining({
      type: 'charge_succeeded',
      amount: 10000,
      provider: 'paystack',
      provider_reference: 'ref_123',
      status: 'success',
    }));
  });

  it('fires notifyWalletTopUp as fire-and-forget', async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const chainMethods = ['select', 'eq', 'insert', 'update', 'order', 'limit', 'range'];
      for (const method of chainMethods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockResolvedValue({
        data: { id: 'wallet-1', balance: 35000 },
        error: null,
      });
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null });
      return chain;
    });

    const payload = {
      event: 'charge.success',
      data: {
        reference: 'ref_notify',
        amount: 1000000,
        metadata: { type: 'wallet_topup', user_id: 'user-1' },
      },
    };

    const request = createWebhookRequest(payload);
    await POST(request);

    expect(mockedNotifyWalletTopUp).toHaveBeenCalledWith(
      'user-1',
      10000,
      35000
    );
  });

  it('updates order and assigns runner on charge.success with order_payment', async () => {
    let updatedFields: unknown = null;

    mockSupabase.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      const chainMethods = ['select', 'eq', 'insert', 'order', 'limit', 'range'];
      for (const method of chainMethods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }
      chain.update = vi.fn().mockImplementation((fields) => {
        if (table === 'orders') {
          updatedFields = fields;
        }
        return chain;
      });
      chain.single = vi.fn().mockResolvedValue({
        data: table === 'orders' ? { cluster_id: 'cluster-1' } : null,
        error: null,
      });
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null });
      return chain;
    });

    mockedAssignRunner.mockResolvedValue(undefined as never);

    const payload = {
      event: 'charge.success',
      data: {
        reference: 'ref_order_pay',
        amount: 1300000, // 13000 Naira
        metadata: { type: 'order_payment', order_id: 'order-1' },
      },
    };

    const request = createWebhookRequest(payload);
    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ received: true });
    expect(updatedFields).toEqual(expect.objectContaining({
      payment_status: 'paid',
      payment_reference: 'ref_order_pay',
      status: 'confirmed',
    }));
    expect(mockedNotifyOrderConfirmed).toHaveBeenCalledWith('order-1');
    expect(mockedAssignRunner).toHaveBeenCalledWith('order-1', 'cluster-1');
  });

  it('still returns 200 when assignRunner fails', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      const chainMethods = ['select', 'eq', 'insert', 'update', 'order', 'limit', 'range'];
      for (const method of chainMethods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockResolvedValue({
        data: table === 'orders' ? { cluster_id: 'cluster-1' } : null,
        error: null,
      });
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null });
      return chain;
    });

    mockedAssignRunner.mockRejectedValue(new Error('No runners available'));

    const payload = {
      event: 'charge.success',
      data: {
        reference: 'ref_fail_assign',
        amount: 1300000,
        metadata: { type: 'order_payment', order_id: 'order-1' },
      },
    };

    const request = createWebhookRequest(payload);
    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ received: true });
  });

  it('returns 200 with received: true for unknown events', async () => {
    const payload = {
      event: 'transfer.success',
      data: { reference: 'ref_unknown' },
    };

    const request = createWebhookRequest(payload);
    const response = await POST(request);
    const { status, body } = await readResponse(response);

    expect(status).toBe(200);
    expect(body).toEqual({ received: true });
  });

  it('verifies signature with raw body string', async () => {
    const payload = { event: 'charge.success', data: { reference: 'r', amount: 100, metadata: {} } };
    const request = createWebhookRequest(payload, 'test-sig-123');

    await POST(request);

    expect(mockedVerifySignature).toHaveBeenCalledWith(
      JSON.stringify(payload),
      'test-sig-123'
    );
  });

  it('does not credit wallet when wallet lookup fails', async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const chainMethods = ['select', 'eq', 'insert', 'update', 'order', 'limit', 'range'];
      for (const method of chainMethods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null });
      return chain;
    });

    const payload = {
      event: 'charge.success',
      data: {
        reference: 'ref_no_wallet',
        amount: 1000000,
        metadata: { type: 'wallet_topup', user_id: 'user-1' },
      },
    };

    const request = createWebhookRequest(payload);
    const response = await POST(request);
    const { status } = await readResponse(response);

    expect(status).toBe(200);
    // rpc should not be called since wallet is null
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });
});
