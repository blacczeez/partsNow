/** Provider-neutral inbound message passed to the WhatsApp router. */
export interface WhatsAppIncomingMessage {
  waId: string;
  text?: string;
  type?: string;
  timestamp?: string;
  media?: {
    url: string;
    id?: string;
  };
  buttonReply?: {
    id: string;
    title: string;
  };
}

/** @deprecated Use WhatsAppIncomingMessage — kept for webhook parsers. */
export interface WatiWebhookPayload {
  waId: string;
  text?: string;
  type?: string;
  timestamp?: string;
  media?: {
    url: string;
    id?: string;
  };
  buttonReply?: {
    id: string;
    title: string;
  };
}

export type WhatsAppProviderName = 'wati' | 'twilio';

export const WHATSAPP_TEMPLATE_NAMES = [
  'order_confirmed',
  'order_dispatched',
  'order_delivered',
  'wallet_topup_success',
] as const;

export type WhatsAppTemplateName = (typeof WHATSAPP_TEMPLATE_NAMES)[number];

export function isWhatsAppTemplateName(name: string): name is WhatsAppTemplateName {
  return (WHATSAPP_TEMPLATE_NAMES as readonly string[]).includes(name);
}

export interface WhatsAppSendResult {
  ok: boolean;
  info?: string;
}
