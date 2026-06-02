import { mockGlobalFetch, createFetchResponse } from '@/lib/__tests__/helpers';

vi.mock('@/lib/config', () => ({
  config: {
    payments: {
      paystackSecretKey: 'sk_test_secret',
    },
  },
}));

const mockFetch = mockGlobalFetch();

// Import after mocks are in place
const { initializePayment, verifyPayment } = await import('../paystack');

afterEach(() => {
  mockFetch.mockReset();
});

describe('initializePayment', () => {
  const defaultParams = {
    email: 'test@example.com',
    amount: 5000,
    reference: 'ref_123',
  };

  it('calls Paystack with amount converted to kobo (×100)', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/abc',
          reference: 'ref_123',
          access_code: 'ac_123',
        },
      })
    );

    await initializePayment(defaultParams);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.amount).toBe(500000); // 5000 × 100
  });

  it('sends correct headers with Bearer token', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/abc',
          reference: 'ref_123',
          access_code: 'ac_123',
        },
      })
    );

    await initializePayment(defaultParams);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer sk_test_secret');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('returns authorizationUrl, reference, and accessCode', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/abc',
          reference: 'ref_123',
          access_code: 'ac_123',
        },
      })
    );

    const result = await initializePayment(defaultParams);

    expect(result).toEqual({
      authorizationUrl: 'https://checkout.paystack.com/abc',
      reference: 'ref_123',
      accessCode: 'ac_123',
    });
  });

  it('includes callback_url and metadata in request body', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/abc',
          reference: 'ref_123',
          access_code: 'ac_123',
        },
      })
    );

    await initializePayment({
      ...defaultParams,
      callbackUrl: 'https://example.com/callback',
      metadata: { type: 'wallet_topup', user_id: 'u1' },
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.callback_url).toBe('https://example.com/callback');
    expect(body.metadata).toEqual({ type: 'wallet_topup', user_id: 'u1' });
  });

  it('throws on status: false with Paystack error message', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: false,
        message: 'Invalid key',
      })
    );

    await expect(initializePayment(defaultParams)).rejects.toThrow('Invalid key');
  });

  it('throws generic message when status is false and no message', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: false,
      })
    );

    await expect(initializePayment(defaultParams)).rejects.toThrow(
      'Failed to initialize payment'
    );
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(initializePayment(defaultParams)).rejects.toThrow('Network error');
  });

  it('rounds fractional kobo amounts', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/abc',
          reference: 'ref_123',
          access_code: 'ac_123',
        },
      })
    );

    await initializePayment({ ...defaultParams, amount: 99.99 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.amount).toBe(9999); // Math.round(99.99 * 100)
  });
});

describe('verifyPayment', () => {
  it('returns amount converted from kobo to Naira (÷100)', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: true,
        data: {
          status: 'success',
          amount: 500000,
          reference: 'ref_123',
          paid_at: '2024-01-15T10:00:00.000Z',
          channel: 'card',
          metadata: { order_id: 'o1' },
        },
      })
    );

    const result = await verifyPayment('ref_123');
    expect(result.amount).toBe(5000);
  });

  it('passes through status, paidAt, channel, and metadata', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: true,
        data: {
          status: 'success',
          amount: 100000,
          reference: 'ref_456',
          paid_at: '2024-01-15T10:00:00.000Z',
          channel: 'bank',
          metadata: { type: 'wallet_topup' },
        },
      })
    );

    const result = await verifyPayment('ref_456');

    expect(result.status).toBe('success');
    expect(result.reference).toBe('ref_456');
    expect(result.paidAt).toBe('2024-01-15T10:00:00.000Z');
    expect(result.channel).toBe('bank');
    expect(result.metadata).toEqual({ type: 'wallet_topup' });
  });

  it('defaults metadata to empty object when null', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: true,
        data: {
          status: 'success',
          amount: 100000,
          reference: 'ref_789',
          paid_at: '2024-01-15T10:00:00.000Z',
          channel: 'card',
          metadata: null,
        },
      })
    );

    const result = await verifyPayment('ref_789');
    expect(result.metadata).toEqual({});
  });

  it('URL-encodes the reference parameter', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: true,
        data: {
          status: 'success',
          amount: 100000,
          reference: 'ref/special&chars',
          paid_at: '2024-01-15T10:00:00.000Z',
          channel: 'card',
          metadata: {},
        },
      })
    );

    await verifyPayment('ref/special&chars');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('ref%2Fspecial%26chars');
  });

  it('throws on status: false', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        status: false,
        message: 'Transaction not found',
      })
    );

    await expect(verifyPayment('ref_bad')).rejects.toThrow('Transaction not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Timeout'));

    await expect(verifyPayment('ref_timeout')).rejects.toThrow('Timeout');
  });
});
