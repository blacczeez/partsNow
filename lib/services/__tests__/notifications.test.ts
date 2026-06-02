import { createMockSupabase } from '@/lib/__tests__/helpers';
import { createServiceClient } from '@/lib/supabase/service';
import {
  sendTemplateMessage,
  sendTextMessage,
  sendInteractiveButtons,
} from '@/lib/integrations/wati';

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/integrations/wati', () => ({
  sendTemplateMessage: vi.fn(),
  sendTextMessage: vi.fn(),
  sendInteractiveButtons: vi.fn(),
}));

const mockedCreateServiceClient = vi.mocked(createServiceClient);
const mockedSendTemplate = vi.mocked(sendTemplateMessage);
const mockedSendText = vi.mocked(sendTextMessage);
const mockedSendInteractive = vi.mocked(sendInteractiveButtons);

// Helper: create a chainable that resolves with given data
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

// Standard order+customer mock setup for getOrderWithCustomerPhone
function setupOrderCustomerMock(
  mockSupabase: ReturnType<typeof createMockSupabase>['mockSupabase'],
  order: Record<string, unknown> | null,
  customer: Record<string, unknown> | null
) {
  let fromCallCount = 0;
  mockSupabase.from.mockImplementation(() => {
    fromCallCount++;
    if (fromCallCount === 1) {
      // orders query
      return createChain(order);
    }
    if (fromCallCount === 2) {
      // users query (customer)
      return createChain(customer);
    }
    return createChain(null);
  });
}

// Get a fresh mockSupabase wired up to createServiceClient
function setupServiceClient() {
  const { mockSupabase, mockRpc } = createMockSupabase();
  mockedCreateServiceClient.mockReturnValue(mockSupabase as any);
  return { mockSupabase, mockRpc };
}

const defaultOrder = {
  order_number: 'ORD-20240115-001',
  total: 13000,
  promised_delivery_minutes: 45,
  customer_id: 'cust-1',
  status: 'confirmed',
};

const defaultCustomer = {
  phone: '2348012345678',
  full_name: 'John Mechanic',
};

beforeEach(() => {
  vi.clearAllMocks();
});

async function getModule() {
  return await import('../notifications');
}

describe('notifyOrderConfirmed', () => {
  it('sends template with correct params', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, defaultOrder, defaultCustomer);

    const { notifyOrderConfirmed } = await getModule();
    await notifyOrderConfirmed('order-1');

    expect(mockedSendTemplate).toHaveBeenCalledWith(
      '2348012345678',
      'order_confirmed',
      expect.objectContaining({
        '1': 'ORD-20240115-001',
        '3': '45',
      })
    );
    // Check that the '2' param contains formatted currency
    const params = mockedSendTemplate.mock.calls[0][2];
    expect(params['2']).toContain('13,000');
  });

  it('uses expressPromiseMinutes default when promised_delivery_minutes is null', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(
      mockSupabase,
      { ...defaultOrder, promised_delivery_minutes: null },
      defaultCustomer
    );

    const { notifyOrderConfirmed } = await getModule();
    await notifyOrderConfirmed('order-1');

    const params = mockedSendTemplate.mock.calls[0][2];
    expect(params['3']).toBe('45'); // config default
  });

  it('returns silently when order not found', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, null, null);

    const { notifyOrderConfirmed } = await getModule();
    await notifyOrderConfirmed('order-nonexistent');

    expect(mockedSendTemplate).not.toHaveBeenCalled();
  });

  it('swallows Wati errors without throwing', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, defaultOrder, defaultCustomer);
    mockedSendTemplate.mockRejectedValue(new Error('Wati down'));

    const { notifyOrderConfirmed } = await getModule();
    // Should not throw
    await expect(notifyOrderConfirmed('order-1')).resolves.toBeUndefined();
  });
});

describe('notifyOrderSourcing', () => {
  it('sends text message with order number', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, defaultOrder, defaultCustomer);

    const { notifyOrderSourcing } = await getModule();
    await notifyOrderSourcing('order-1');

    expect(mockedSendText).toHaveBeenCalledWith(
      '2348012345678',
      expect.stringContaining('ORD-20240115-001')
    );
    expect(mockedSendText.mock.calls[0][1]).toContain('being sourced');
  });

  it('returns silently when order not found', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, null, null);

    const { notifyOrderSourcing } = await getModule();
    await notifyOrderSourcing('order-1');

    expect(mockedSendText).not.toHaveBeenCalled();
  });
});

describe('notifyOrderDispatched', () => {
  it('uses provided riderName when given', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, defaultOrder, defaultCustomer);

    const { notifyOrderDispatched } = await getModule();
    await notifyOrderDispatched('order-1', 'Emeka', 'https://track.me/123');

    expect(mockedSendTemplate).toHaveBeenCalledWith(
      '2348012345678',
      'order_dispatched',
      expect.objectContaining({
        '1': 'ORD-20240115-001',
        '2': 'Emeka',
        '4': 'https://track.me/123',
      })
    );
  });

  it('looks up rider from assignment when riderName not provided', async () => {
    const { mockSupabase } = setupServiceClient();

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return createChain(defaultOrder); // order
      if (fromCallCount === 2) return createChain(defaultCustomer); // customer
      if (fromCallCount === 3) return createChain({ assignee_id: 'rider-1' }); // assignment
      if (fromCallCount === 4) return createChain({ full_name: 'Chidi', phone: '2349087654321' }); // rider user
      return createChain(null);
    });

    const { notifyOrderDispatched } = await getModule();
    await notifyOrderDispatched('order-1');

    const params = mockedSendTemplate.mock.calls[0][2];
    expect(params['2']).toBe('Chidi');
    expect(params['5']).toBe('2349087654321');
  });

  it('uses "Your rider" when no assignment found', async () => {
    const { mockSupabase } = setupServiceClient();

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return createChain(defaultOrder);
      if (fromCallCount === 2) return createChain(defaultCustomer);
      if (fromCallCount === 3) return createChain(null); // no assignment
      return createChain(null);
    });

    const { notifyOrderDispatched } = await getModule();
    await notifyOrderDispatched('order-1');

    const params = mockedSendTemplate.mock.calls[0][2];
    expect(params['2']).toBe('Your rider');
    expect(params['5']).toBe('N/A');
  });

  it('includes trackingUrl falling back to default', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, defaultOrder, defaultCustomer);

    const { notifyOrderDispatched } = await getModule();
    await notifyOrderDispatched('order-1', 'Emeka');

    const params = mockedSendTemplate.mock.calls[0][2];
    expect(params['4']).toContain('/order/order-1');
  });
});

describe('notifyOrderDelivered', () => {
  it('sends template with order number', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, defaultOrder, defaultCustomer);

    const { notifyOrderDelivered } = await getModule();
    await notifyOrderDelivered('order-1');

    expect(mockedSendTemplate).toHaveBeenCalledWith(
      '2348012345678',
      'order_delivered',
      { '1': 'ORD-20240115-001' }
    );
  });

  it('returns silently when order not found', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, null, null);

    const { notifyOrderDelivered } = await getModule();
    await notifyOrderDelivered('order-1');

    expect(mockedSendTemplate).not.toHaveBeenCalled();
  });
});

describe('notifyOrderCancelled', () => {
  it('includes reason in the text message', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, defaultOrder, defaultCustomer);

    const { notifyOrderCancelled } = await getModule();
    await notifyOrderCancelled('order-1', 'Part unavailable');

    expect(mockedSendText).toHaveBeenCalledWith(
      '2348012345678',
      expect.stringContaining('Part unavailable')
    );
    expect(mockedSendText.mock.calls[0][1]).toContain('ORD-20240115-001');
    expect(mockedSendText.mock.calls[0][1]).toContain('cancelled');
  });

  it('returns silently when order not found', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, null, null);

    const { notifyOrderCancelled } = await getModule();
    await notifyOrderCancelled('order-1', 'reason');

    expect(mockedSendText).not.toHaveBeenCalled();
  });
});

describe('notifyWalletTopUp', () => {
  it('sends template with formatted amounts to user phone', async () => {
    const { mockSupabase } = setupServiceClient();

    // notifyWalletTopUp queries users directly, not via getOrderWithCustomerPhone
    const userChain = createChain({ phone: '2348012345678' });
    mockSupabase.from.mockReturnValue(userChain);

    const { notifyWalletTopUp } = await getModule();
    await notifyWalletTopUp('user-1', 5000, 15000);

    expect(mockedSendTemplate).toHaveBeenCalledWith(
      '2348012345678',
      'wallet_topup_success',
      expect.objectContaining({
        '1': expect.stringContaining('5,000'),
        '2': expect.stringContaining('15,000'),
      })
    );
  });

  it('returns silently when user not found', async () => {
    const { mockSupabase } = setupServiceClient();

    const userChain = createChain(null);
    mockSupabase.from.mockReturnValue(userChain);

    const { notifyWalletTopUp } = await getModule();
    await notifyWalletTopUp('user-1', 5000, 15000);

    expect(mockedSendTemplate).not.toHaveBeenCalled();
  });
});

describe('notifyClarificationRequest', () => {
  it('sends interactive buttons with Reply and Call Support', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, defaultOrder, defaultCustomer);

    const { notifyClarificationRequest } = await getModule();
    await notifyClarificationRequest('order-1', 'Which year model?');

    expect(mockedSendInteractive).toHaveBeenCalledWith(
      '2348012345678',
      expect.stringContaining('Which year model?'),
      [
        { id: 'clarify_order-1', title: 'Reply' },
        { id: 'call_support', title: 'Call Support' },
      ]
    );
  });

  it('includes order number in the body text', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, defaultOrder, defaultCustomer);

    const { notifyClarificationRequest } = await getModule();
    await notifyClarificationRequest('order-1', 'Which spec?');

    const bodyText = mockedSendInteractive.mock.calls[0][1];
    expect(bodyText).toContain('ORD-20240115-001');
  });

  it('returns silently when order not found', async () => {
    const { mockSupabase } = setupServiceClient();
    setupOrderCustomerMock(mockSupabase, null, null);

    const { notifyClarificationRequest } = await getModule();
    await notifyClarificationRequest('order-1', 'Which spec?');

    expect(mockedSendInteractive).not.toHaveBeenCalled();
  });
});
