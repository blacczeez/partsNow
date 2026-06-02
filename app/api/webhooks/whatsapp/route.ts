import { NextRequest, NextResponse } from 'next/server';
import { verifyWatiWebhookSignature } from '@/lib/integrations/wati';
import { routeIncomingMessage } from '@/lib/services/whatsapp/router';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-wati-signature') || '';

  if (!verifyWatiWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // Process asynchronously — return 200 immediately
  try {
    await routeIncomingMessage(payload);
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
  }

  return NextResponse.json({ received: true });
}
