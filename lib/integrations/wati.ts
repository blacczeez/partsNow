import { config } from '@/lib/config';
import crypto from 'crypto';

/** Skip outbound calls when WATI is not configured (local dev without WhatsApp). */
export function isWatiConfigured(): boolean {
  const url = config.whatsapp.apiUrl?.trim() ?? '';
  const key = config.whatsapp.apiKey?.trim() ?? '';
  return Boolean(key && url.startsWith('http'));
}

interface WatiApiResponse {
  result: boolean;
  info?: string;
}

interface SendTemplateParams {
  phone: string;
  templateName: string;
  parameters: Record<string, string>;
}

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  parameters: Record<string, string>
): Promise<WatiApiResponse | null> {
  if (!isWatiConfigured()) return null;

  try {
    const response = await fetch(
      `${config.whatsapp.apiUrl}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(phone)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.whatsapp.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_name: templateName,
          broadcast_name: 'order_update',
          parameters: Object.entries(parameters).map(([name, value]) => ({
            name,
            value,
          })),
        }),
      }
    );

    const data = await response.json();
    return data as WatiApiResponse;
  } catch (error) {
    console.error(`Wati sendTemplateMessage error (${templateName}):`, error);
    return null;
  }
}

export async function sendTextMessage(
  phone: string,
  message: string
): Promise<WatiApiResponse | null> {
  if (!isWatiConfigured()) return null;

  try {
    const response = await fetch(
      `${config.whatsapp.apiUrl}/api/v1/sendSessionMessage/${encodeURIComponent(phone)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.whatsapp.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageText: message,
        }),
      }
    );

    const data = await response.json();
    return data as WatiApiResponse;
  } catch (error) {
    console.error('Wati sendTextMessage error:', error);
    return null;
  }
}

export async function sendInteractiveButtons(
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<WatiApiResponse | null> {
  if (!isWatiConfigured()) return null;

  try {
    const response = await fetch(
      `${config.whatsapp.apiUrl}/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${encodeURIComponent(phone)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.whatsapp.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: bodyText,
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: {
              id: b.id,
              title: b.title,
            },
          })),
        }),
      }
    );

    const data = await response.json();
    return data as WatiApiResponse;
  } catch (error) {
    console.error('Wati sendInteractiveButtons error:', error);
    return null;
  }
}

export function verifyWatiWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!config.whatsapp.webhookSecret) return true; // Skip verification if no secret configured

  const hash = crypto
    .createHmac('sha256', config.whatsapp.webhookSecret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

export async function getMediaUrl(
  mediaId: string
): Promise<string | null> {
  if (!isWatiConfigured()) return null;

  try {
    const response = await fetch(
      `${config.whatsapp.apiUrl}/api/v1/getMedia/${encodeURIComponent(mediaId)}`,
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.apiKey}`,
        },
      }
    );

    const data = await response.json();
    return data?.url ?? null;
  } catch (error) {
    console.error('Wati getMediaUrl error:', error);
    return null;
  }
}
