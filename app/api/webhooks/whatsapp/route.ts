import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import {
  getWhatsAppProvider,
  parseTwilioWebhook,
  parseWatiWebhook,
  verifyWhatsAppWebhook,
  type WatiWebhookPayload,
} from '@/lib/integrations/whatsapp';
import { routeIncomingMessage } from '@/lib/services/whatsapp/router';

function getWebhookUrl(request: NextRequest): string {
  const configured = config.whatsapp.twilio.webhookUrl?.trim();
  if (configured) return configured;
  return `${config.app.url}${request.nextUrl.pathname}`;
}

export async function POST(request: NextRequest) {
  const provider = getWhatsAppProvider();

  try {
    if (provider === 'twilio') {
      const rawBody = await request.text();
      const params = Object.fromEntries(new URLSearchParams(rawBody));
      const signature = request.headers.get('x-twilio-signature') || '';
      const webhookUrl = getWebhookUrl(request);

      if (
        !verifyWhatsAppWebhook({
          provider: 'twilio',
          rawBody,
          twilioSignature: signature,
          twilioParams: params,
          webhookUrl,
        })
      ) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      await routeIncomingMessage(parseTwilioWebhook(params));
    } else {
      const rawBody = await request.text();
      const signature = request.headers.get('x-wati-signature') || '';

      if (
        !verifyWhatsAppWebhook({
          provider: 'wati',
          rawBody,
          watiSignature: signature,
          webhookUrl: getWebhookUrl(request),
        })
      ) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const payload = JSON.parse(rawBody) as WatiWebhookPayload;
      await routeIncomingMessage(parseWatiWebhook(payload));
    }
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
  }

  return NextResponse.json({ received: true });
}
