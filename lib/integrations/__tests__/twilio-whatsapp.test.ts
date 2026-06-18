import crypto from 'crypto';
import { mockGlobalFetch, createFetchResponse, getFetchMockCall } from '@/lib/__tests__/helpers';

vi.mock('@/lib/config', () => ({
  config: {
    whatsapp: {
      twilio: {
        accountSid: 'ACtest',
        authToken: 'test-auth-token',
        whatsappFrom: 'whatsapp:+14155238886',
        webhookUrl: 'https://app.example.com/api/webhooks/whatsapp',
        templates: {
          order_confirmed: 'HXconfirmed',
          order_dispatched: '',
          order_delivered: '',
          wallet_topup_success: '',
        },
      },
    },
  },
}));

const mockFetch = mockGlobalFetch();

const {
  sendTemplateMessage,
  sendTextMessage,
  sendInteractiveButtons,
  parseTwilioWebhook,
  verifyTwilioWebhookSignature,
} = await import('../twilio-whatsapp');

afterEach(() => {
  mockFetch.mockReset();
});

describe('Twilio WhatsApp sendTextMessage', () => {
  it('posts to Twilio Messages API with Basic auth', async () => {
    mockFetch.mockResolvedValue(createFetchResponse({ sid: 'SM123' }));

    await sendTextMessage('08012345678', 'Hello mechanic');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const { url, init } = getFetchMockCall(mockFetch);
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toMatch(/^Basic /);

    const body = init.body as string;
    expect(body).toContain('Body=Hello+mechanic');
    expect(body).toContain('To=whatsapp%3A%2B2348012345678');
    expect(body).toContain('From=whatsapp%3A%2B14155238886');
  });
});

describe('Twilio WhatsApp sendTemplateMessage', () => {
  it('uses ContentSid when configured', async () => {
    mockFetch.mockResolvedValue(createFetchResponse({ sid: 'SM124' }));

    await sendTemplateMessage('2348012345678', 'order_confirmed', {
      '1': 'ORD-001',
      '2': '15000',
      '3': '45',
    });

    const body = getFetchMockCall(mockFetch).init.body as string;
    expect(body).toContain('ContentSid=HXconfirmed');
    expect(body).toContain('ContentVariables=');
  });

  it('falls back to text when template sid is missing', async () => {
    mockFetch.mockResolvedValue(createFetchResponse({ sid: 'SM125' }));

    await sendTemplateMessage('2348012345678', 'order_dispatched', {
      '1': 'ORD-001',
      '2': 'Rider',
      '3': '30',
      '4': 'https://track',
      '5': '080',
    });

    const body = getFetchMockCall(mockFetch).init.body as string;
    expect(body).toContain('Body=');
    expect(body).not.toContain('ContentSid=');
  });
});

describe('Twilio WhatsApp sendInteractiveButtons', () => {
  it('sends a text menu with reply ids', async () => {
    mockFetch.mockResolvedValue(createFetchResponse({ sid: 'SM126' }));

    await sendInteractiveButtons('2348012345678', 'Choose an option', [
      { id: 'start_order', title: 'Order Parts' },
      { id: 'check_balance', title: 'Wallet' },
    ]);

    const body = decodeURIComponent(getFetchMockCall(mockFetch).init.body as string);
    expect(body).toContain('start_order');
    expect(body).toContain('check_balance');
  });
});

describe('parseTwilioWebhook', () => {
  it('normalizes inbound text messages', () => {
    const message = parseTwilioWebhook({
      From: 'whatsapp:+2348012345678',
      Body: 'I need brake pads',
      NumMedia: '0',
    });

    expect(message.waId).toBe('2348012345678');
    expect(message.text).toBe('I need brake pads');
    expect(message.type).toBe('text');
  });

  it('maps button replies and audio media', () => {
    const message = parseTwilioWebhook({
      From: 'whatsapp:+2348012345678',
      ButtonPayload: 'confirm_quote',
      ButtonText: 'Continue',
      NumMedia: '0',
    });

    expect(message.buttonReply?.id).toBe('confirm_quote');
    expect(message.text).toBe('confirm_quote');

    const audio = parseTwilioWebhook({
      From: 'whatsapp:+2348012345678',
      NumMedia: '1',
      MediaUrl0: 'https://api.twilio.com/media/abc',
      MediaContentType0: 'audio/ogg',
      MessageSid: 'SM999',
    });

    expect(audio.type).toBe('audio');
    expect(audio.media?.url).toBe('https://api.twilio.com/media/abc');
  });
});

describe('verifyTwilioWebhookSignature', () => {
  it('accepts a valid signature', () => {
    const params = { Body: 'Hi', From: 'whatsapp:+2348012345678' };
    const url = 'https://app.example.com/api/webhooks/whatsapp';
    const payload = `${url}BodyHiFromwhatsapp:+2348012345678`;
    const signature = crypto
      .createHmac('sha1', 'test-auth-token')
      .update(payload, 'utf8')
      .digest('base64');

    expect(verifyTwilioWebhookSignature(url, params, signature)).toBe(true);
  });
});
