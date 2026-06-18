import { config } from '@/lib/config';
import type {
  WhatsAppIncomingMessage,
  WhatsAppProviderName,
  WhatsAppSendResult,
  WatiWebhookPayload,
} from '@/lib/types/whatsapp';
import * as wati from '@/lib/integrations/wati';
import * as twilio from '@/lib/integrations/twilio-whatsapp';

export type { WhatsAppIncomingMessage, WatiWebhookPayload };

export function getWhatsAppProvider(): WhatsAppProviderName {
  return config.whatsapp.provider === 'twilio' ? 'twilio' : 'wati';
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppProvider() === 'twilio'
    ? twilio.isTwilioWhatsAppConfigured()
    : wati.isWatiConfigured();
}

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  parameters: Record<string, string>
): Promise<WhatsAppSendResult | null> {
  if (getWhatsAppProvider() === 'twilio') {
    return twilio.sendTemplateMessage(phone, templateName, parameters);
  }
  return wati.sendTemplateMessage(phone, templateName, parameters);
}

export async function sendTextMessage(
  phone: string,
  message: string
): Promise<WhatsAppSendResult | null> {
  if (getWhatsAppProvider() === 'twilio') {
    return twilio.sendTextMessage(phone, message);
  }
  return wati.sendTextMessage(phone, message);
}

export async function sendInteractiveButtons(
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<WhatsAppSendResult | null> {
  if (getWhatsAppProvider() === 'twilio') {
    return twilio.sendInteractiveButtons(phone, bodyText, buttons);
  }
  return wati.sendInteractiveButtons(phone, bodyText, buttons);
}

export async function getMediaUrl(mediaId: string): Promise<string | null> {
  if (getWhatsAppProvider() === 'twilio') {
    return twilio.getMediaUrl(mediaId);
  }
  return wati.getMediaUrl(mediaId);
}

export function parseWatiWebhook(payload: WatiWebhookPayload): WhatsAppIncomingMessage {
  return {
    waId: payload.waId,
    text: payload.text,
    type: payload.type,
    timestamp: payload.timestamp,
    media: payload.media,
    buttonReply: payload.buttonReply,
  };
}

export function parseTwilioWebhook(
  params: Record<string, string>
): WhatsAppIncomingMessage {
  return twilio.parseTwilioWebhook(params);
}

export function verifyWhatsAppWebhook(input: {
  provider: WhatsAppProviderName;
  rawBody: string;
  watiSignature?: string;
  twilioSignature?: string;
  twilioParams?: Record<string, string>;
  webhookUrl: string;
}): boolean {
  if (input.provider === 'twilio') {
    return twilio.verifyTwilioWebhookSignature(
      input.webhookUrl,
      input.twilioParams ?? {},
      input.twilioSignature ?? ''
    );
  }
  return wati.verifyWatiWebhookSignature(input.rawBody, input.watiSignature ?? '');
}

/** @deprecated Use verifyWhatsAppWebhook */
export function verifyWatiWebhookSignature(
  payload: string,
  signature: string
): boolean {
  return wati.verifyWatiWebhookSignature(payload, signature);
}

/** @deprecated Use isWhatsAppConfigured */
export function isWatiConfigured(): boolean {
  return wati.isWatiConfigured();
}
