import { createMockSupabase } from '@/lib/__tests__/helpers';
import { createClient } from '@/lib/supabase/server';
import { initializePayment, verifyPayment } from '@/lib/integrations/paystack';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/integrations/paystack', () => ({
  initializePayment: vi.fn(),
  verifyPayment: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createClient);
const mockedInitializePayment = vi.mocked(initializePayment);
const mockedVerifyPayment = vi.mocked(verifyPayment);

// Helper: create a from() chain that returns specific data for .single()
function createChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'insert', 'update', 'eq', 'in', 'is', 'gte', 'order', 'range'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error });
  // Make thenable for non-.single() awaits
  (chain as any).then = (resolve: (v: unknown) => void, reject: (v: unknown) => void) =>
    Promise.resolve({ data, error, count: null }).then(resolve, reject);
  return chain;
}

describe('debitWallet', () => {
  function setup() {
    const { mockSupabase, mockRpc } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);
    return { mockSupabase, mockRpc };
  }

  async function getDebitWallet() {
    const mod = await import('../wallet');
    return mod.debitWallet;
  }

  it('returns true when wallet exists and RPC succeeds', async () => {
    const { mockSupabase, mockRpc } = setup();

    const walletChain = createChain({ id: 'wallet-1' });
    mockSupabase.from.mockReturnValue(walletChain);
    mockRpc.mockResolvedValue({ data: true, error: null });

    const debitWallet = await getDebitWallet();
    const result = await debitWallet('user-1', 5000, 'order-1', 'Test debit');
    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('debit_wallet', {
      p_wallet_id: 'wallet-1',
      p_amount: 5000,
      p_reference: 'order-1',
      p_description: 'Test debit',
    });
  });

  it('returns false when wallet is not found', async () => {
    const { mockSupabase } = setup();

    const walletChain = createChain(null, { message: 'Not found' });
    mockSupabase.from.mockReturnValue(walletChain);

    const debitWallet = await getDebitWallet();
    const result = await debitWallet('user-1', 5000, 'order-1', 'Test debit');
    expect(result).toBe(false);
  });

  it('returns false when RPC returns false (insufficient balance)', async () => {
    const { mockSupabase, mockRpc } = setup();

    const walletChain = createChain({ id: 'wallet-1' });
    mockSupabase.from.mockReturnValue(walletChain);
    mockRpc.mockResolvedValue({ data: false, error: null });

    const debitWallet = await getDebitWallet();
    const result = await debitWallet('user-1', 5000, 'order-1', 'Test debit');
    expect(result).toBe(false);
  });
});

describe('creditWallet', () => {
  function setup() {
    const { mockSupabase, mockRpc } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);
    return { mockSupabase, mockRpc };
  }

  async function getCreditWallet() {
    const mod = await import('../wallet');
    return mod.creditWallet;
  }

  it('returns true when wallet exists and RPC succeeds', async () => {
    const { mockSupabase, mockRpc } = setup();

    const walletChain = createChain({ id: 'wallet-1' });
    mockSupabase.from.mockReturnValue(walletChain);
    mockRpc.mockResolvedValue({ data: true, error: null });

    const creditWallet = await getCreditWallet();
    const result = await creditWallet('user-1', 3000, 'topup-1', 'Top up');
    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('credit_wallet', {
      p_wallet_id: 'wallet-1',
      p_amount: 3000,
      p_reference: 'topup-1',
      p_description: 'Top up',
    });
  });

  it('returns false when wallet is not found', async () => {
    const { mockSupabase } = setup();

    const walletChain = createChain(null, { message: 'Not found' });
    mockSupabase.from.mockReturnValue(walletChain);

    const creditWallet = await getCreditWallet();
    const result = await creditWallet('user-1', 3000, 'topup-1', 'Top up');
    expect(result).toBe(false);
  });

  it('returns false when RPC returns false', async () => {
    const { mockSupabase, mockRpc } = setup();

    const walletChain = createChain({ id: 'wallet-1' });
    mockSupabase.from.mockReturnValue(walletChain);
    mockRpc.mockResolvedValue({ data: false, error: null });

    const creditWallet = await getCreditWallet();
    const result = await creditWallet('user-1', 3000, 'topup-1', 'Top up');
    expect(result).toBe(false);
  });
});

describe('initiateTopUp', () => {
  function setup() {
    const { mockSupabase, mockRpc } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);
    return { mockSupabase, mockRpc };
  }

  async function getInitiateTopUp() {
    const mod = await import('../wallet');
    return mod.initiateTopUp;
  }

  it('returns authorizationUrl and reference on success', async () => {
    const { mockSupabase } = setup();

    const userChain = createChain({ email: 'user@test.com', phone: '2348012345678' });
    mockSupabase.from.mockReturnValue(userChain);

    mockedInitializePayment.mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/abc',
      reference: 'topup_user-1_12345',
      accessCode: 'ac_123',
    });

    const initiateTopUp = await getInitiateTopUp();
    const result = await initiateTopUp('user-1', 10000);

    expect(result.authorizationUrl).toBe('https://checkout.paystack.com/abc');
    expect(result.reference).toBeDefined();
  });

  it('uses phone@partsnow.ng fallback when user has no email', async () => {
    const { mockSupabase } = setup();

    const userChain = createChain({ email: null, phone: '2348012345678' });
    mockSupabase.from.mockReturnValue(userChain);

    mockedInitializePayment.mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/abc',
      reference: 'topup_ref',
      accessCode: 'ac_123',
    });

    const initiateTopUp = await getInitiateTopUp();
    await initiateTopUp('user-1', 10000);

    expect(mockedInitializePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        email: '2348012345678@partsnow.ng',
      })
    );
  });

  it('throws when user is not found', async () => {
    const { mockSupabase } = setup();

    const userChain = createChain(null, { message: 'Not found' });
    mockSupabase.from.mockReturnValue(userChain);

    const initiateTopUp = await getInitiateTopUp();
    await expect(initiateTopUp('user-1', 10000)).rejects.toThrow('User not found');
  });

  it('passes metadata with type wallet_topup and user_id', async () => {
    const { mockSupabase } = setup();

    const userChain = createChain({ email: 'user@test.com', phone: '2348012345678' });
    mockSupabase.from.mockReturnValue(userChain);

    mockedInitializePayment.mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/abc',
      reference: 'topup_ref',
      accessCode: 'ac_123',
    });

    const initiateTopUp = await getInitiateTopUp();
    await initiateTopUp('user-1', 10000);

    expect(mockedInitializePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { type: 'wallet_topup', user_id: 'user-1' },
      })
    );
  });
});

describe('verifyAndCreditTopUp', () => {
  async function getVerifyAndCreditTopUp() {
    const mod = await import('../wallet');
    return mod.verifyAndCreditTopUp;
  }

  it('returns current balance without duplicate processing when already processed', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    // Track which table is being queried
    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // payment_events query — found existing
        return createChain({ id: 'pe-1' });
      }
      // wallets query for getWalletBalance
      return createChain({ balance: 25000, held_balance: 0, currency: 'NGN' });
    });

    const verifyAndCreditTopUp = await getVerifyAndCreditTopUp();
    const result = await verifyAndCreditTopUp('user-1', 'ref_existing');

    expect(result.success).toBe(true);
    expect(result.amount).toBe(0); // No new amount credited
    expect(result.newBalance).toBe(25000);
    // verifyPayment should NOT be called
    expect(mockedVerifyPayment).not.toHaveBeenCalled();
  });

  it('credits wallet and logs event on successful Paystack verification', async () => {
    const { mockSupabase, mockRpc } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    let fromCallCount = 0;
    const insertChain = createChain(null);
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // payment_events — not found (not yet processed)
        return createChain(null, { message: 'Not found' });
      }
      if (fromCallCount === 2) {
        // wallets — find wallet for credit
        return createChain({ id: 'wallet-1' });
      }
      if (fromCallCount === 3) {
        // payment_events insert
        return insertChain;
      }
      // wallets — getWalletBalance at the end
      return createChain({ balance: 15000, held_balance: 0, currency: 'NGN' });
    });

    mockRpc.mockResolvedValue({ data: true, error: null });

    mockedVerifyPayment.mockResolvedValue({
      status: 'success',
      amount: 5000,
      reference: 'ref_new',
      paidAt: '2024-01-15T10:00:00.000Z',
      channel: 'card',
      metadata: {},
    });

    const verifyAndCreditTopUp = await getVerifyAndCreditTopUp();
    const result = await verifyAndCreditTopUp('user-1', 'ref_new');

    expect(result.success).toBe(true);
    expect(result.amount).toBe(5000);
    expect(result.newBalance).toBe(15000);
    expect(mockRpc).toHaveBeenCalledWith('credit_wallet', {
      p_wallet_id: 'wallet-1',
      p_amount: 5000,
      p_reference: 'ref_new',
      p_description: 'Wallet top-up via Paystack',
    });
  });

  it('returns success: false when Paystack verification shows failed status', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    mockSupabase.from.mockImplementation(() => {
      // payment_events — not found
      return createChain(null, { message: 'Not found' });
    });

    mockedVerifyPayment.mockResolvedValue({
      status: 'failed',
      amount: 5000,
      reference: 'ref_failed',
      paidAt: '',
      channel: 'card',
      metadata: {},
    });

    const verifyAndCreditTopUp = await getVerifyAndCreditTopUp();
    const result = await verifyAndCreditTopUp('user-1', 'ref_failed');

    expect(result.success).toBe(false);
  });

  it('throws when wallet not found after successful verification', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // payment_events — not found
        return createChain(null, { message: 'Not found' });
      }
      // wallets — not found
      return createChain(null, { message: 'Not found' });
    });

    mockedVerifyPayment.mockResolvedValue({
      status: 'success',
      amount: 5000,
      reference: 'ref_no_wallet',
      paidAt: '2024-01-15T10:00:00.000Z',
      channel: 'card',
      metadata: {},
    });

    const verifyAndCreditTopUp = await getVerifyAndCreditTopUp();
    await expect(verifyAndCreditTopUp('user-1', 'ref_no_wallet')).rejects.toThrow(
      'Wallet not found'
    );
  });
});
