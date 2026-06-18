import { mockGlobalFetch, createFetchResponse } from '@/lib/__tests__/helpers';

const watiMocks = vi.hoisted(() => ({
  sendTemplateMessage: vi.fn(),
  sendTextMessage: vi.fn(),
  sendInteractiveButtons: vi.fn(),
  isWatiConfigured: vi.fn(() => true),
  verifyWatiWebhookSignature: vi.fn(() => true),
  getMediaUrl: vi.fn(),
}));

const twilioMocks = vi.hoisted(() => ({
  sendTemplateMessage: vi.fn(),
  sendTextMessage: vi.fn(),
  sendInteractiveButtons: vi.fn(),
  isTwilioWhatsAppConfigured: vi.fn(() => true),
  verifyTwilioWebhookSignature: vi.fn(() => true),
  parseTwilioWebhook: vi.fn(),
  getMediaUrl: vi.fn(),
}));

vi.mock('@/lib/integrations/wati', () => watiMocks);
vi.mock('@/lib/integrations/twilio-whatsapp', () => twilioMocks);

vi.mock('@/lib/config', () => ({
  config: {
    whatsapp: {
      provider: 'wati',
    },
  },
}));

const mockFetch = mockGlobalFetch();

describe('whatsapp provider facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('routes outbound calls to Wati by default', async () => {
    const whatsapp = await import('../whatsapp');

    await whatsapp.sendTextMessage('2348012345678', 'hello');
    await whatsapp.sendTemplateMessage('2348012345678', 'order_confirmed', { '1': 'x' });
    await whatsapp.sendInteractiveButtons('2348012345678', 'body', [
      { id: 'a', title: 'A' },
    ]);

    expect(watiMocks.sendTextMessage).toHaveBeenCalled();
    expect(watiMocks.sendTemplateMessage).toHaveBeenCalled();
    expect(watiMocks.sendInteractiveButtons).toHaveBeenCalled();
    expect(twilioMocks.sendTextMessage).not.toHaveBeenCalled();
  });

  it('routes outbound calls to Twilio when provider is twilio', async () => {
    const { config } = await import('@/lib/config');
    (config.whatsapp as { provider: string }).provider = 'twilio';

    vi.resetModules();
    const whatsapp = await import('../whatsapp');

    await whatsapp.sendTextMessage('2348012345678', 'hello');

    expect(twilioMocks.sendTextMessage).toHaveBeenCalledWith('2348012345678', 'hello');
    expect(watiMocks.sendTextMessage).not.toHaveBeenCalled();
  });
});
