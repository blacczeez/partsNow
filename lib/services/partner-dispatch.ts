import { createServiceClient } from '@/lib/supabase/service';
import { config } from '@/lib/config';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
import { notifyOrderDispatched } from '@/lib/services/notifications';
import {
  createKwikDelivery,
  isKwikConfigured,
  type CreateKwikDeliveryParams,
} from '@/lib/integrations/kwik';
import type { DeliveryVehicleType } from '@/lib/types/delivery';

export interface PartnerDispatchResult {
  reference: string;
  trackingUrl: string;
  partner: string;
}

/** Oversized (van) or explicit partner tier — eligible for Kwik/partner dispatch. */
export function shouldOfferPartnerDispatch(
  vehicleType: DeliveryVehicleType | string | null | undefined
): boolean {
  return vehicleType === 'van' || vehicleType === 'partner';
}

/** Partner-only tiers skip internal rider pool entirely. */
export function requiresPartnerDispatchOnly(
  vehicleType: DeliveryVehicleType | string | null | undefined
): boolean {
  return vehicleType === 'partner';
}

async function resolvePartnerTrackingRiderId(
  supabase: ReturnType<typeof createServiceClient>
): Promise<string> {
  const configured = config.dispatch.partnerDispatchRiderId?.trim();
  if (configured) return configured;

  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('user_type', 'admin')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (admin?.id) return admin.id as string;

  const { data: rider } = await supabase
    .from('users')
    .select('id')
    .eq('user_type', 'rider')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!rider?.id) {
    throw new Error('No user available for partner delivery tracking record');
  }

  return rider.id as string;
}

function buildKwikParams(order: {
  id: string;
  order_number: string;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  customer: { full_name: string; phone: string };
  cluster: {
    name: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  };
  packageDescription: string;
}): CreateKwikDeliveryParams {
  const pickupAddress = `${order.cluster.name}, ${order.cluster.city}, ${order.cluster.state}`;

  return {
    orderId: order.id,
    orderReference: order.order_number,
    packageDescription: order.packageDescription,
    pickup: {
      address: pickupAddress,
      latitude: Number(order.cluster.latitude),
      longitude: Number(order.cluster.longitude),
      contactName: 'PartsDey Gate',
      contactPhone: config.dispatch.opsContactPhone,
    },
    delivery: {
      address: order.delivery_address,
      latitude: Number(order.delivery_latitude ?? order.cluster.latitude),
      longitude: Number(order.delivery_longitude ?? order.cluster.longitude),
      contactName: order.customer.full_name,
      contactPhone: order.customer.phone,
    },
  };
}

export async function assignPartnerDelivery(
  orderId: string
): Promise<PartnerDispatchResult | null> {
  if (!isKwikConfigured()) {
    console.warn('Partner dispatch skipped: Kwik API not configured');
    return null;
  }

  if (config.dispatch.partner !== 'kwik') {
    console.warn(`Partner dispatch skipped: unsupported partner ${config.dispatch.partner}`);
    return null;
  }

  const supabase = createServiceClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, order_number, delivery_address, delivery_latitude, delivery_longitude, cluster_id, customer_id, delivery_vehicle_type, total_weight_kg, promised_delivery_minutes, order_items(description, quantity)'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('Partner dispatch: order not found', orderError?.message);
    return null;
  }

  const typedOrder = order as {
    id: string;
    order_number: string;
    delivery_address: string;
    delivery_latitude: number | null;
    delivery_longitude: number | null;
    cluster_id: string;
    customer_id: string;
    delivery_vehicle_type: string | null;
    total_weight_kg: number | null;
    promised_delivery_minutes: number | null;
    order_items: Array<{ description: string; quantity: number }>;
  };

  if (!shouldOfferPartnerDispatch(typedOrder.delivery_vehicle_type)) {
    return null;
  }

  const { data: cluster } = await supabase
    .from('clusters')
    .select('name, city, state, latitude, longitude')
    .eq('id', typedOrder.cluster_id)
    .single();

  if (!cluster) {
    console.error('Partner dispatch: cluster not found');
    return null;
  }

  const { data: customer } = await supabase
    .from('users')
    .select('full_name, phone')
    .eq('id', typedOrder.customer_id)
    .single();

  if (!customer) {
    console.error('Partner dispatch: customer not found');
    return null;
  }

  const itemsSummary = (typedOrder.order_items ?? [])
    .map((i) => `${i.quantity}× ${i.description}`)
    .join(', ');
  const weightNote =
    typedOrder.total_weight_kg != null ? ` (${typedOrder.total_weight_kg} kg)` : '';
  const packageDescription = `Parts order ${typedOrder.order_number}${weightNote}: ${itemsSummary}`;

  try {
    const kwikResult = await createKwikDelivery(
      buildKwikParams({
        ...typedOrder,
        customer: customer as { full_name: string; phone: string },
        cluster: cluster as {
          name: string;
          city: string;
          state: string;
          latitude: number;
          longitude: number;
        },
        packageDescription,
      })
    );

    const trackingRiderId = await resolvePartnerTrackingRiderId(supabase);

    const trackingPayload = {
      order_id: orderId,
      rider_id: trackingRiderId,
      partner_reference: kwikResult.deliveryId,
      partner_tracking_url: kwikResult.trackingUrl || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existingTracking } = await supabase
      .from('delivery_tracking')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    const trackingError = existingTracking
      ? (
          await supabase.from('delivery_tracking').update(trackingPayload).eq('order_id', orderId)
        ).error
      : (await supabase.from('delivery_tracking').insert(trackingPayload)).error;

    if (trackingError) {
      console.error('Partner dispatch: tracking save failed', trackingError.message);
    }

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'dispatched',
        dispatched_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (orderUpdateError) {
      console.error('Partner dispatch: order update failed', orderUpdateError.message);
      return null;
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.ORDER_DISPATCHED,
      entityType: 'order',
      entityId: orderId,
      newValues: auditDetails('Partner courier dispatched via Kwik', {
        partner: 'kwik',
        reference: kwikResult.deliveryId,
        trackingUrl: kwikResult.trackingUrl,
      }),
    });

    notifyOrderDispatched(
      orderId,
      'Partner courier (Kwik)',
      kwikResult.trackingUrl || `${config.app.url}/order/${orderId}`
    ).catch(() => {});

    return {
      reference: kwikResult.deliveryId,
      trackingUrl: kwikResult.trackingUrl,
      partner: 'kwik',
    };
  } catch (error) {
    console.error('Partner dispatch failed:', error);
    return null;
  }
}

export async function handlePartnerDispatchWebhook(payload: {
  event?: string;
  status?: string;
  reference?: string;
  delivery_id?: string;
  order_id?: string;
  rider?: { latitude?: number; longitude?: number };
  eta?: number;
}): Promise<void> {
  const supabase = createServiceClient();
  const reference = payload.delivery_id ?? payload.reference;
  if (!reference && !payload.order_id) return;

  let orderId = payload.order_id;

  if (!orderId && reference) {
    const { data: tracking } = await supabase
      .from('delivery_tracking')
      .select('order_id')
      .eq('partner_reference', reference)
      .maybeSingle();
    orderId = tracking?.order_id as string | undefined;
  }

  if (!orderId) return;

  const status = (payload.status ?? payload.event ?? '').toLowerCase();

  if (payload.rider?.latitude != null && payload.rider?.longitude != null) {
    await supabase
      .from('delivery_tracking')
      .update({
        current_latitude: payload.rider.latitude,
        current_longitude: payload.rider.longitude,
        eta_minutes: payload.eta ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);
  }

  if (status.includes('delivered') || status === 'delivery.completed') {
    await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'dispatched');
  }
}
