import { config } from '@/lib/config';

const KWIK_API = config.dispatch.kwik.apiUrl.replace(/\/$/, '');

export interface KwikDeliveryAddress {
  address: string;
  latitude: number;
  longitude: number;
  contactName: string;
  contactPhone: string;
}

export interface CreateKwikDeliveryParams {
  pickup: KwikDeliveryAddress;
  delivery: KwikDeliveryAddress;
  packageDescription: string;
  orderId: string;
  orderReference: string;
}

export interface KwikDeliveryResult {
  deliveryId: string;
  trackingUrl: string;
  estimatedPickup?: string;
  estimatedDelivery?: string;
  price?: number;
}

export function isKwikConfigured(): boolean {
  return Boolean(config.dispatch.kwik.apiUrl && config.dispatch.kwik.apiKey);
}

export async function createKwikDelivery(
  params: CreateKwikDeliveryParams
): Promise<KwikDeliveryResult> {
  if (!isKwikConfigured()) {
    throw new Error('Kwik dispatch is not configured');
  }

  const response = await fetch(`${KWIK_API}/deliveries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.dispatch.kwik.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pickup: {
        address: params.pickup.address,
        latitude: params.pickup.latitude,
        longitude: params.pickup.longitude,
        contact_name: params.pickup.contactName,
        contact_phone: params.pickup.contactPhone,
      },
      delivery: {
        address: params.delivery.address,
        latitude: params.delivery.latitude,
        longitude: params.delivery.longitude,
        contact_name: params.delivery.contactName,
        contact_phone: params.delivery.contactPhone,
      },
      package_description: params.packageDescription,
      reference: params.orderReference,
      metadata: { order_id: params.orderId },
      callback_url: `${config.app.url}/api/webhooks/dispatch`,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data?.message === 'string' ? data.message : 'Failed to create Kwik delivery';
    throw new Error(message);
  }

  const payload = data.data ?? data;

  return {
    deliveryId: String(payload.id ?? payload.delivery_id ?? params.orderReference),
    trackingUrl: String(payload.tracking_url ?? payload.trackingUrl ?? ''),
    estimatedPickup: payload.estimated_pickup,
    estimatedDelivery: payload.estimated_delivery,
    price: typeof payload.price === 'number' ? payload.price : undefined,
  };
}

export async function getKwikDeliveryStatus(deliveryId: string): Promise<{
  status: string;
  riderName?: string;
  riderPhone?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  eta?: number;
}> {
  if (!isKwikConfigured()) {
    throw new Error('Kwik dispatch is not configured');
  }

  const response = await fetch(`${KWIK_API}/deliveries/${deliveryId}`, {
    headers: {
      Authorization: `Bearer ${config.dispatch.kwik.apiKey}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? 'Failed to fetch Kwik delivery status');
  }

  const payload = data.data ?? data;

  return {
    status: payload.status,
    riderName: payload.rider?.name,
    riderPhone: payload.rider?.phone,
    currentLatitude: payload.rider?.latitude,
    currentLongitude: payload.rider?.longitude,
    eta: payload.eta,
  };
}

export function verifyKwikWebhookSignature(body: string, signature: string): boolean {
  const secret = config.dispatch.kwik.webhookSecret;
  if (!secret) return false;
  if (!signature) return false;

  const crypto = require('crypto') as typeof import('crypto');
  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return hash === signature || hash === signature.replace(/^sha256=/, '');
}
