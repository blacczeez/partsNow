import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import {
  getMarkupPercentage,
  calculatePricing,
  isCodAllowedForCustomer,
} from '@/lib/utils/pricing';
import { computeVendorBudget } from '@/lib/utils/vendor-budget';
import { initializePayment } from '@/lib/integrations/paystack';
import { debitWallet } from './wallet';
import { assignRunner } from './dispatch';
import { notifyOrderConfirmed } from './notifications';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
import type { Order, OrderWithItems, LoyaltyTier } from '@/lib/types/database';

interface CreateOrderInput {
  items: Array<{
    partId?: string;
    description: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }>;
  vehicleId?: string;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNotes?: string;
  paymentMethod: 'wallet' | 'card' | 'cod';
  sourceChannel?: 'whatsapp' | 'web' | 'app';
}

export async function createOrder(
  input: CreateOrderInput,
  customerId: string
): Promise<Order & { paymentUrl?: string }> {
  const supabase = await createClient();

  // Get customer with wallet
  const { data: customer, error: customerError } = await supabase
    .from('users')
    .select('*')
    .eq('id', customerId)
    .single();

  if (customerError || !customer) {
    throw new Error('Customer not found');
  }

  // Find nearest cluster
  const clusterId = await findNearestCluster(
    supabase,
    input.deliveryLatitude,
    input.deliveryLongitude
  );

  // Calculate pricing with server-side loyalty tier
  const loyaltyTier = customer.loyalty_tier as LoyaltyTier;
  const markupPercentage = getMarkupPercentage(loyaltyTier);
  const pricing = calculatePricing(input.items, loyaltyTier);

  // Validate COD
  if (
    input.paymentMethod === 'cod' &&
    !isCodAllowedForCustomer(pricing.total, customer.profile as Record<string, unknown>)
  ) {
    const profile = customer.profile as Record<string, unknown> | null;
    if (profile?.cod_disabled === true) {
      throw new Error('COD is not available on your account due to previous delivery refusals');
    }
    throw new Error(
      `COD is not available for orders above ${config.payments.codMaxOrderValue}`
    );
  }

  // Generate order number
  const { data: orderNumber } = await supabase.rpc('generate_order_number');

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: customerId,
      cluster_id: clusterId,
      vehicle_id: input.vehicleId || null,
      status: 'pending',
      delivery_address: input.deliveryAddress,
      delivery_latitude: input.deliveryLatitude || null,
      delivery_longitude: input.deliveryLongitude || null,
      delivery_notes: input.deliveryNotes || null,
      delivery_type: 'express' as const,
      subtotal: pricing.subtotal,
      markup_amount: pricing.markupAmount,
      delivery_fee: pricing.deliveryFee,
      discount_amount: pricing.discountAmount,
      total: pricing.total,
      original_total: pricing.total,
      payment_method: input.paymentMethod,
      payment_status: 'pending' as const,
      source_channel: input.sourceChannel || 'web',
      promised_delivery_minutes: config.delivery.expressPromiseMinutes,
      payment_hold_expires_at: new Date(
        Date.now() + config.payments.paymentHoldExpiryMinutes * 60 * 1000
      ).toISOString(),
    })
    .select()
    .single();

  if (orderError) throw new Error(orderError.message);

  // Insert order items
  const orderItems = input.items.map((item) => {
    const sellingPrice = Math.round(item.price * (1 + markupPercentage / 100));
    const budget = computeVendorBudget(sellingPrice, markupPercentage);
    return {
      order_id: order.id,
      part_id: item.partId || null,
      description: item.description,
      quantity: item.quantity,
      selling_price: sellingPrice,
      expected_vendor_price: budget.expectedVendorPrice,
      max_vendor_price: budget.maxVendorPrice,
      vendor_price: null,
      customer_image_url: item.imageUrl || null,
    };
  });

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw new Error(itemsError.message);

  await writeAuditLog({
    userId: customerId,
    action: AUDIT_ACTIONS.ORDER_CREATED,
    entityType: 'order',
    entityId: order.id,
    newValues: auditDetails(`Order ${orderNumber} placed`, {
      orderNumber,
      paymentMethod: input.paymentMethod,
      total: pricing.total,
      sourceChannel: input.sourceChannel || 'web',
      itemCount: input.items.length,
    }),
  });

  // Process payment
  if (input.paymentMethod === 'wallet') {
    const debited = await debitWallet(
      customerId,
      pricing.total,
      order.id,
      `Order ${orderNumber}`
    );

    if (!debited) {
      // Clean up the order
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      const { data: walletRow } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', customerId)
        .single();
      const available = walletRow?.balance ?? 0;
      throw new Error(
        `Insufficient wallet balance. Available: ₦${Number(available).toLocaleString('en-NG')}, required: ₦${pricing.total.toLocaleString('en-NG')}`
      );
    }

    // Confirm order
    await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // Update customer stats
    await supabase
      .from('users')
      .update({
        total_orders: customer.total_orders + 1,
        lifetime_spend: customer.lifetime_spend + pricing.total,
      })
      .eq('id', customerId);

    // Auto-assign runner
    try {
      await assignRunner(order.id, clusterId);
    } catch {
      // Assignment failure should not fail order creation
    }

    // Fire-and-forget notification
    notifyOrderConfirmed(order.id).catch(() => {});

    return { ...order, status: 'confirmed' as const, payment_status: 'paid' as const };
  }

  if (input.paymentMethod === 'card') {
    const email = customer.email || `${customer.phone}@partsnow.ng`;
    const result = await initializePayment({
      email,
      amount: pricing.total,
      reference: `order_${order.id}_${Date.now()}`,
      callbackUrl: `${config.app.url}/order/${order.id}?reference=`,
      metadata: {
        type: 'order_payment',
        order_id: order.id,
      },
    });

    // Store reference
    await supabase
      .from('orders')
      .update({ payment_reference: result.reference })
      .eq('id', order.id);

    return { ...order, paymentUrl: result.authorizationUrl };
  }

  if (input.paymentMethod === 'cod') {
    await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // Update customer stats
    await supabase
      .from('users')
      .update({
        total_orders: customer.total_orders + 1,
      })
      .eq('id', customerId);

    // Auto-assign runner
    try {
      await assignRunner(order.id, clusterId);
    } catch {
      // Assignment failure should not fail order creation
    }

    // Fire-and-forget notification
    notifyOrderConfirmed(order.id).catch(() => {});

    return { ...order, status: 'confirmed' as const };
  }

  return order;
}

export async function listOrders(
  customerId: string,
  options: { page?: number; limit?: number; status?: string }
): Promise<{ orders: OrderWithItems[]; total: number }> {
  const supabase = await createClient();
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('orders')
    .select('*, order_items(*)', { count: 'exact' })
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.status) {
    if (options.status === 'active') {
      query = query.in('status', [
        'pending',
        'confirmed',
        'sourcing',
        'picked',
        'dispatched',
      ]);
    } else if (options.status === 'completed') {
      query = query.in('status', ['delivered', 'cancelled', 'rejected', 'failed']);
    } else {
      query = query.eq('status', options.status);
    }
  }

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  return { orders: (data || []) as OrderWithItems[], total: count || 0 };
}

async function findNearestCluster(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lat?: number,
  lng?: number
): Promise<string> {
  if (!lat || !lng) {
    // Default to Lagos-Ladipo
    const { data } = await supabase
      .from('clusters')
      .select('id')
      .eq('name', 'Lagos-Ladipo')
      .single();

    if (data) return data.id;

    // Fallback: get any active cluster
    const { data: any } = await supabase
      .from('clusters')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (any) return any.id;
    throw new Error('No active clusters available');
  }

  const { data: clusters } = await supabase
    .from('clusters')
    .select('*')
    .eq('is_active', true);

  if (!clusters || clusters.length === 0) {
    throw new Error('No active clusters available');
  }

  let nearestCluster = clusters[0];
  let minDistance = calculateDistance(lat, lng, clusters[0].latitude, clusters[0].longitude);

  for (const cluster of clusters) {
    const distance = calculateDistance(lat, lng, cluster.latitude, cluster.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCluster = cluster;
    }
  }

  if (minDistance > nearestCluster.delivery_radius_km) {
    throw new Error('Delivery address outside service area');
  }

  return nearestCluster.id;
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
