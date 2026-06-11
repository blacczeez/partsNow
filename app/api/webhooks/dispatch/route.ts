import { NextRequest, NextResponse } from 'next/server';
import { verifyKwikWebhookSignature } from '@/lib/integrations/kwik';
import { handlePartnerDispatchWebhook } from '@/lib/services/partner-dispatch';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature =
    request.headers.get('x-kwik-signature') ||
    request.headers.get('x-webhook-signature') ||
    '';

  if (config.dispatch.kwik.webhookSecret) {
    if (!verifyKwikWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = (payload.data ?? payload) as Record<string, unknown>;

  await handlePartnerDispatchWebhook({
    event: typeof payload.event === 'string' ? payload.event : undefined,
    status: typeof data.status === 'string' ? data.status : undefined,
    reference: typeof data.reference === 'string' ? data.reference : undefined,
    delivery_id:
      typeof data.delivery_id === 'string'
        ? data.delivery_id
        : typeof data.id === 'string'
          ? data.id
          : undefined,
    order_id:
      typeof data.order_id === 'string'
        ? data.order_id
        : typeof (data.metadata as Record<string, unknown> | undefined)?.order_id === 'string'
          ? ((data.metadata as Record<string, unknown>).order_id as string)
          : undefined,
    rider:
      data.rider && typeof data.rider === 'object'
        ? (data.rider as { latitude?: number; longitude?: number })
        : undefined,
    eta: typeof data.eta === 'number' ? data.eta : undefined,
  });

  return NextResponse.json({ received: true });
}
