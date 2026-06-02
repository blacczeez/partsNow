import { mockGlobalFetch, createFetchResponse } from '@/lib/__tests__/helpers';

vi.mock('@/lib/config', () => ({
  config: {
    whatsapp: {
      apiUrl: 'https://live-server-test.wati.io',
      apiKey: 'test-api-key',
      webhookSecret: 'test-secret',
    },
  },
}));

const mockFetch = mockGlobalFetch();

const { sendTemplateMessage, sendTextMessage, sendInteractiveButtons, getMediaUrl } =
  await import('../wati');

afterEach(() => {
  mockFetch.mockReset();
});

describe('sendTemplateMessage', () => {
  it('calls the correct URL with encoded phone number', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: true })
    );

    await sendTemplateMessage('2348012345678', 'order_confirmed', { '1': 'ORD-001' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe(
      'https://live-server-test.wati.io/api/v1/sendTemplateMessage?whatsappNumber=2348012345678'
    );
  });

  it('sends correct headers with Bearer token', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: true })
    );

    await sendTemplateMessage('2348012345678', 'order_confirmed', {});

    const opts = mockFetch.mock.calls[0][1];
    expect(opts.headers.Authorization).toBe('Bearer test-api-key');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.method).toBe('POST');
  });

  it('maps parameters from {k:v} to [{name,value}] array', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: true })
    );

    await sendTemplateMessage('2348012345678', 'order_confirmed', {
      '1': 'ORD-001',
      '2': '₦5,000',
      '3': '45',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.template_name).toBe('order_confirmed');
    expect(body.broadcast_name).toBe('order_update');
    expect(body.parameters).toEqual([
      { name: '1', value: 'ORD-001' },
      { name: '2', value: '₦5,000' },
      { name: '3', value: '45' },
    ]);
  });

  it('returns the response data', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: true, info: 'sent' })
    );

    const result = await sendTemplateMessage('2348012345678', 'order_confirmed', {});
    expect(result).toEqual({ result: true, info: 'sent' });
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await sendTemplateMessage('2348012345678', 'order_confirmed', {});
    expect(result).toBeNull();
  });
});

describe('sendTextMessage', () => {
  it('calls the sendSessionMessage endpoint with encoded phone', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: true })
    );

    await sendTextMessage('2348012345678', 'Hello');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe(
      'https://live-server-test.wati.io/api/v1/sendSessionMessage/2348012345678'
    );
  });

  it('sends messageText in the body', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: true })
    );

    await sendTextMessage('2348012345678', 'Your order is ready!');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.messageText).toBe('Your order is ready!');
  });

  it('returns the response data', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: true })
    );

    const result = await sendTextMessage('2348012345678', 'test');
    expect(result).toEqual({ result: true });
  });

  it('returns null on error', async () => {
    mockFetch.mockRejectedValue(new Error('fail'));

    const result = await sendTextMessage('2348012345678', 'test');
    expect(result).toBeNull();
  });
});

describe('sendInteractiveButtons', () => {
  const buttons = [
    { id: 'reply_1', title: 'Reply' },
    { id: 'call_support', title: 'Call Support' },
  ];

  it('calls the sendInteractiveButtonsMessage endpoint', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: true })
    );

    await sendInteractiveButtons('2348012345678', 'Choose an option:', buttons);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe(
      'https://live-server-test.wati.io/api/v1/sendInteractiveButtonsMessage?whatsappNumber=2348012345678'
    );
  });

  it('maps buttons [{id,title}] to [{type:"reply",reply:{id,title}}]', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: true })
    );

    await sendInteractiveButtons('2348012345678', 'Choose:', buttons);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.body).toBe('Choose:');
    expect(body.buttons).toEqual([
      { type: 'reply', reply: { id: 'reply_1', title: 'Reply' } },
      { type: 'reply', reply: { id: 'call_support', title: 'Call Support' } },
    ]);
  });

  it('returns the response data', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: true })
    );

    const result = await sendInteractiveButtons('2348012345678', 'Choose:', buttons);
    expect(result).toEqual({ result: true });
  });

  it('returns null on error', async () => {
    mockFetch.mockRejectedValue(new Error('fail'));

    const result = await sendInteractiveButtons('2348012345678', 'Choose:', buttons);
    expect(result).toBeNull();
  });
});

describe('getMediaUrl', () => {
  it('returns the URL from the response', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ url: 'https://cdn.wati.io/media/123.jpg' })
    );

    const result = await getMediaUrl('media-123');
    expect(result).toBe('https://cdn.wati.io/media/123.jpg');
  });

  it('calls the correct endpoint with encoded mediaId', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ url: 'https://cdn.wati.io/media/123.jpg' })
    );

    await getMediaUrl('media/special');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe(
      'https://live-server-test.wati.io/api/v1/getMedia/media%2Fspecial'
    );
  });

  it('returns null when response has no url field', async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({ result: false })
    );

    const result = await getMediaUrl('media-456');
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    mockFetch.mockRejectedValue(new Error('fail'));

    const result = await getMediaUrl('media-789');
    expect(result).toBeNull();
  });
});
