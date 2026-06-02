import { createMockSupabase } from '@/lib/__tests__/helpers';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createClient);

// Helper: create a from() chain that returns specific data for .single()
function createChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'insert', 'update', 'eq', 'in', 'is', 'gte', 'order', 'range'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error });
  (chain as any).then = (resolve: (v: unknown) => void, reject: (v: unknown) => void) =>
    Promise.resolve({ data, error, count: null }).then(resolve, reject);
  return chain;
}

describe('getOrCreateWallet', () => {
  async function getModule() {
    return await import('../users');
  }

  it('returns existing wallet when one exists', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const existingWallet = { id: 'w-1', user_id: 'u-1', balance: 5000, held_balance: 0, currency: 'NGN' };
    const walletChain = createChain(existingWallet);
    mockSupabase.from.mockReturnValue(walletChain);

    const { getOrCreateWallet } = await getModule();
    const result = await getOrCreateWallet('u-1');

    expect(result).toEqual(existingWallet);
  });

  it('creates a new wallet when none exists', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const newWallet = { id: 'w-new', user_id: 'u-1', balance: 0, held_balance: 0, currency: 'NGN' };
    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // First call: select existing — not found
        return createChain(null, { message: 'Not found' });
      }
      // Second call: insert new wallet
      return createChain(newWallet);
    });

    const { getOrCreateWallet } = await getModule();
    const result = await getOrCreateWallet('u-1');

    expect(result).toEqual(newWallet);
  });

  it('throws when insert fails', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return createChain(null, { message: 'Not found' });
      }
      return createChain(null, { message: 'Insert failed' });
    });

    const { getOrCreateWallet } = await getModule();
    await expect(getOrCreateWallet('u-1')).rejects.toThrow('Insert failed');
  });
});

describe('createUserProfile', () => {
  async function getModule() {
    return await import('../users');
  }

  it('creates a user with car_owner type and auto-creates wallet', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const createdUser = {
      id: 'u-1',
      phone: '2348012345678',
      full_name: 'John Doe',
      email: null,
      user_type: 'car_owner',
      profile: {},
    };

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // users insert
        return createChain(createdUser);
      }
      // getOrCreateWallet: select existing wallet (or create)
      return createChain({ id: 'w-1', user_id: 'u-1', balance: 0 });
    });

    const { createUserProfile } = await getModule();
    const result = await createUserProfile({
      id: 'u-1',
      phone: '2348012345678',
      full_name: 'John Doe',
    });

    expect(result).toEqual(createdUser);
  });

  it('stores delivery_address in profile JSON', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const createdUser = {
      id: 'u-1',
      phone: '2348012345678',
      full_name: 'John Doe',
      email: null,
      user_type: 'car_owner',
      profile: { delivery_address: '123 Test St' },
    };

    let fromCallCount = 0;
    const insertChain = createChain(createdUser);
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return insertChain;
      return createChain({ id: 'w-1' });
    });

    const { createUserProfile } = await getModule();
    await createUserProfile({
      id: 'u-1',
      phone: '2348012345678',
      full_name: 'John Doe',
      delivery_address: '123 Test St',
    });

    // Verify the insert was called with correct profile
    const insertCall = insertChain.insert.mock.calls[0][0];
    expect(insertCall.profile).toEqual({ delivery_address: '123 Test St' });
  });

  it('sets empty profile when no delivery_address provided', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const createdUser = {
      id: 'u-1',
      phone: '2348012345678',
      full_name: 'John Doe',
      email: null,
      user_type: 'car_owner',
      profile: {},
    };

    let fromCallCount = 0;
    const insertChain = createChain(createdUser);
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return insertChain;
      return createChain({ id: 'w-1' });
    });

    const { createUserProfile } = await getModule();
    await createUserProfile({
      id: 'u-1',
      phone: '2348012345678',
      full_name: 'John Doe',
    });

    const insertCall = insertChain.insert.mock.calls[0][0];
    expect(insertCall.profile).toEqual({});
  });

  it('sets email to null when omitted', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const createdUser = { id: 'u-1', phone: '2348012345678', full_name: 'John', email: null };

    let fromCallCount = 0;
    const insertChain = createChain(createdUser);
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return insertChain;
      return createChain({ id: 'w-1' });
    });

    const { createUserProfile } = await getModule();
    await createUserProfile({
      id: 'u-1',
      phone: '2348012345678',
      full_name: 'John',
    });

    const insertCall = insertChain.insert.mock.calls[0][0];
    expect(insertCall.email).toBeNull();
  });

  it('throws on database error', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const insertChain = createChain(null, { message: 'Duplicate phone' });
    mockSupabase.from.mockReturnValue(insertChain);

    const { createUserProfile } = await getModule();
    await expect(
      createUserProfile({
        id: 'u-1',
        phone: '2348012345678',
        full_name: 'John',
      })
    ).rejects.toThrow('Duplicate phone');
  });
});

describe('updateUserProfile', () => {
  async function getModule() {
    return await import('../users');
  }

  it('updates full_name', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const updatedUser = { id: 'u-1', full_name: 'New Name' };
    const updateChain = createChain(updatedUser);
    mockSupabase.from.mockReturnValue(updateChain);

    const { updateUserProfile } = await getModule();
    const result = await updateUserProfile('u-1', { full_name: 'New Name' });

    expect(result).toEqual(updatedUser);
    const updateCall = updateChain.update.mock.calls[0][0];
    expect(updateCall.full_name).toBe('New Name');
  });

  it('sets email to null when empty string is provided', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const updatedUser = { id: 'u-1', email: null };
    const updateChain = createChain(updatedUser);
    mockSupabase.from.mockReturnValue(updateChain);

    const { updateUserProfile } = await getModule();
    await updateUserProfile('u-1', { email: '' });

    const updateCall = updateChain.update.mock.calls[0][0];
    expect(updateCall.email).toBeNull();
  });

  it('updates profile object', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const updatedUser = { id: 'u-1', profile: { delivery_address: '456 New St' } };
    const updateChain = createChain(updatedUser);
    mockSupabase.from.mockReturnValue(updateChain);

    const { updateUserProfile } = await getModule();
    await updateUserProfile('u-1', { profile: { delivery_address: '456 New St' } });

    const updateCall = updateChain.update.mock.calls[0][0];
    expect(updateCall.profile).toEqual({ delivery_address: '456 New St' });
  });

  it('always sets updated_at', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const updateChain = createChain({ id: 'u-1' });
    mockSupabase.from.mockReturnValue(updateChain);

    const { updateUserProfile } = await getModule();
    await updateUserProfile('u-1', { full_name: 'Test' });

    const updateCall = updateChain.update.mock.calls[0][0];
    expect(updateCall.updated_at).toBeDefined();
    // Should be a valid ISO date string
    expect(new Date(updateCall.updated_at).toISOString()).toBe(updateCall.updated_at);
  });

  it('throws on database error', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    const updateChain = createChain(null, { message: 'Update failed' });
    mockSupabase.from.mockReturnValue(updateChain);

    const { updateUserProfile } = await getModule();
    await expect(updateUserProfile('u-1', { full_name: 'X' })).rejects.toThrow('Update failed');
  });
});
