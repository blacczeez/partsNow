import crypto from 'crypto';
import { config } from '@/lib/config';
import { normalizePhone } from '@/lib/utils/format';
import {
  isWhatsAppTemplateName,
  type WhatsAppIncomingMessage,
  type WhatsAppSendResult,
  type WhatsAppTemplateName,
} from '@/lib/types/whatsapp';

export function isTwilioWhatsAppConfigured(): boolean {
  const { accountSid, authToken, whatsappFrom } = config.whatsapp.twilio;
  return Boolean(
    accountSid?.trim() &&
      authToken?.trim() &&
      whatsappFrom?.trim().startsWith('whatsapp:')
  );
}

function twilioApiUrl(path: string): string {
  const { accountSid } = config.whatsapp.twilio;
  return `https://api.twilio.com/2010-04-01/Accounts/${accountSid}${path}`;
}

function twilioAuthHeader(): string {
  const { accountSid, authToken } = config.whatsapp.twilio;
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
}

function toTwilioWhatsAppAddress(phone: string): string {
  return `whatsapp:+${normalizePhone(phone)}`;
}

function getTemplateContentSid(templateName: string): string | null {
  if (!isWhatsAppTemplateName(templateName)) return null;
  const sid = config.whatsapp.twilio.templates[templateName].trim();
  return sid || null;
}

function buildTemplateFallbackText(
  templateName: WhatsAppTemplateName | string,
  parameters: Record<string, string>
): string {
  const values = Object.keys(parameters)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((key) => parameters[key]);

  switch (templateName) {
    case 'order_confirmed':
      return `Order confirmed: ${values[0] ?? ''}\nTotal: ${values[1] ?? ''}\nETA: ${values[2] ?? ''} minutes`;
    case 'order_dispatched':
      return `Your order ${values[0] ?? ''} is on the way!\nRider: ${values[1] ?? ''}\nETA: ${values[2] ?? ''} minutes\nTrack: ${values[3] ?? ''}`;
    case 'order_delivered':
      return `Delivered! Order ${values[0] ?? ''}. Thank you for using PartsDey.`;
    case 'wallet_topup_success':
      return `Wallet top-up successful!\nAmount: ${values[0] ?? ''}\nNew balance: ${values[1] ?? ''}`;
    default:
      return `${templateName}: ${values.join(' · ')}`;
  }
}

async function postTwilioMessage(
  params: Record<string, string>
): Promise<WhatsAppSendResult | null> {
  if (!isTwilioWhatsAppConfigured()) return null;

  try {
    const response = await fetch(twilioApiUrl('/Messages.json'), {
      method: 'POST',
      headers: {
        Authorization: twilioAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });

    const data = (await response.json()) as { sid?: string; message?: string };
    if (!response.ok) {
      console.error('Twilio WhatsApp send error:', data.message ?? response.statusText);
      return { ok: false, info: data.message };
    }

    return { ok: true, info: data.sid };
  } catch (error) {
    console.error('Twilio WhatsApp send error:', error);
    return null;
  }
}

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  parameters: Record<string, string>
): Promise<WhatsAppSendResult | null> {
  const contentSid = getTemplateContentSid(templateName);
  const to = toTwilioWhatsAppAddress(phone);
  const from = config.whatsapp.twilio.whatsappFrom;

  if (contentSid) {
    return postTwilioMessage({
      To: to,
      From: from,
      ContentSid: contentSid,
      ContentVariables: JSON.stringify(parameters),
    });
  }

  return sendTextMessage(phone, buildTemplateFallbackText(templateName, parameters));
}

export async function sendTextMessage(
  phone: string,
  message: string
): Promise<WhatsAppSendResult | null> {
  return postTwilioMessage({
    To: toTwilioWhatsAppAddress(phone),
    From: config.whatsapp.twilio.whatsappFrom,
    Body: message,
  });
}

export async function sendInteractiveButtons(
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<WhatsAppSendResult | null> {
  const options = buttons
    .map((button) => `• ${button.title} (reply: ${button.id})`)
    .join('\n');

  return sendTextMessage(phone, `${bodyText}\n\n${options}`);
}

export async function getMediaUrl(mediaIdOrUrl: string): Promise<string | null> {
  if (!isTwilioWhatsAppConfigured()) return null;
  if (mediaIdOrUrl.startsWith('http')) return mediaIdOrUrl;

  try {
    const response = await fetch(mediaIdOrUrl, {
      headers: { Authorization: twilioAuthHeader() },
      redirect: 'follow',
    });
    if (!response.ok) return null;
    return response.url;
  } catch (error) {
    console.error('Twilio getMediaUrl error:', error);
    return null;
  }
}

export function verifyTwilioWebhookSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const { authToken } = config.whatsapp.twilio;
  if (!authToken?.trim()) return true;

  const sortedKeys = Object.keys(params).sort();
  let payload = url;
  for (const key of sortedKeys) {
    payload += key + params[key];
  }

  const expected = crypto
    .createHmac('sha1', authToken)
    .update(payload, 'utf8')
    .digest('base64');

  return expected === signature;
}

export function parseTwilioWebhook(
  params: Record<string, string>
): WhatsAppIncomingMessage {
  const rawFrom = params.From ?? '';
  const waId = normalizePhone(rawFrom.replace(/^whatsapp:/i, '').replace(/^\+/, ''));

  const buttonPayload = params.ButtonPayload?.trim();
  const buttonText = params.ButtonText?.trim();
  const body = params.Body?.trim() ?? '';

  const numMedia = Number.parseInt(params.NumMedia ?? '0', 10);
  let type = 'text';
  let media: WhatsAppIncomingMessage['media'];

  if (numMedia > 0 && params.MediaUrl0) {
    const contentType = params.MediaContentType0 ?? '';
    if (contentType.startsWith('audio/')) type = 'audio';
    else if (contentType.startsWith('image/')) type = 'image';
    else type = 'media';

    media = {
      url: params.MediaUrl0,
      id: params.MessageSid,
    };
  }

  const resolvedText = buttonPayload || body;

  return {
    waId,
    text: resolvedText,
    type,
    timestamp: params.DateSent,
    media,
    buttonReply: buttonPayload
      ? { id: buttonPayload, title: buttonText || buttonPayload }
      : undefined,
  };
}
