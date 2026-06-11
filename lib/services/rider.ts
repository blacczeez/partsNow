import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';
import {
  notifyOrderDispatched,
  notifyOrderDelivered,
  notifyOrderNearby,
} from './notifications';
import {
  reportDeliveryFailure as reportDeliveryFailureCore,
  type ReportDeliveryFailureInput,
} from './delivery-failure';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
import type {
  OrderWithItems,
  OrderAssignment,
  OrderItem,
  DeliveryTracking,
  DeliveryAttempt,
} from '@/lib/types/database';

// ===== Types =====

export interface RiderDeliverySummary {
  id: string;
  order_number: string;
  status: string;
  total: number;
  delivery_address: string;
  delivery_notes: string | null;
  payment_method: string;
  payment_status: string;
  created_at: string;
  item_count: number;
  assignment_status: string;
  assigned_at: string;
  customer_name: string;
  customer_phone: string;
  is_high_value: boolean;
  order_items: OrderItem[];
}

export interface RiderDeliveryDetail extends OrderWithItems {
  assignment: OrderAssignment;
  customer_name: string;
  customer_phone: string;
  is_high_value: boolean;
  tracking: DeliveryTracking | null;
  delivery_attempts: DeliveryAttempt[];
}

export interface RiderHistoryEntry {
  id: string;
  order_number: string;
  status: string;
  total: number;
  delivery_address: string;
  payment_method: string;
  assignment_status: string;
  completed_at: string | null;
  delivered_at: string | null;
}

// ===== Orders =====

export async function getRiderOrders(riderId: string): Promise<RiderDeliverySummary[]> {
  const supabase = await createClient();

  // Get active assignments for this rider
  const { data: assignments, error: assignError } = await supabase
    .from('order_assignments')
    .select('order_id, status, assigned_at')
    .eq('assignee_id', riderId)
    .eq('role', 'rider')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  if (assignError || !assignments || assignments.length === 0) return [];

  const orderIds = assignments.map((a) => a.order_id);

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_number, status, total, delivery_address, delivery_notes, payment_method, payment_status, created_at, customer_id, order_items(*)')
    .in('id', orderIds)
    .order('created_at', { ascending: false });

  if (ordersError || !orders) return [];

  // Get customer info for all orders
  const customerIds = [...new Set(orders.map((o) => o.customer_id))];
  const { data: customers } = await supabase
    .from('users')
    .select('id, full_name, phone')
    .in('id', customerIds);

  const customerMap = new Map(customers?.map((c) => [c.id, c]) || []);
  const assignmentMap = new Map(assignments.map((a) => [a.order_id, a]));

  return orders.map((order) => {
    const assignment = assignmentMap.get(order.id)!;
    const customer = customerMap.get(order.customer_id);

    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total: order.total,
      delivery_address: order.delivery_address,
      delivery_notes: order.delivery_notes,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      created_at: order.created_at,
      item_count: order.order_items?.length ?? 0,
      assignment_status: assignment.status,
      assigned_at: assignment.assigned_at,
      customer_name: customer?.full_name ?? 'Unknown',
      customer_phone: customer?.phone ?? '',
      is_high_value: order.total >= config.dispatch.highValueThreshold,
      order_items: order.order_items ?? [],
    };
  }) as RiderDeliverySummary[];
}

export async function getRiderDeliveryDetail(
  riderId: string,
  orderId: string
): Promise<RiderDeliveryDetail> {
  const supabase = await createClient();

  // Verify assignment exists
  const { data: assignment, error: assignError } = await supabase
    .from('order_assignments')
    .select('*')
    .eq('assignee_id', riderId)
    .eq('order_id', orderId)
    .eq('role', 'rider')
    .single();

  if (assignError || !assignment) {
    throw new Error('Delivery not assigned to you');
  }

  // Get order with items
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error('Order not found');
  }

  // Get customer info
  const { data: customer } = await supabase
    .from('users')
    .select('full_name, phone')
    .eq('id', order.customer_id)
    .single();

  // Get tracking data
  const { data: tracking } = await supabase
    .from('delivery_tracking')
    .select('*')
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .single();

  // Get delivery attempts (all riders on this order)
  const { data: attempts } = await supabase
    .from('delivery_attempts')
    .select('*')
    .eq('order_id', orderId)
    .order('attempt_number', { ascending: true });

  return {
    ...order,
    assignment: assignment as OrderAssignment,
    customer_name: customer?.full_name ?? 'Unknown',
    customer_phone: customer?.phone ?? '',
    is_high_value: order.total >= config.dispatch.highValueThreshold,
    tracking: (tracking as DeliveryTracking) ?? null,
    delivery_attempts: (attempts as DeliveryAttempt[]) ?? [],
  } as RiderDeliveryDetail;
}

// ===== Actions =====

export async function confirmPickup(
  riderId: string,
  orderId: string,
  pickupPhotoUrl?: string
): Promise<void> {
  const supabase = await createClient();

  // Get assignment
  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('id, status')
    .eq('assignee_id', riderId)
    .eq('order_id', orderId)
    .eq('role', 'rider')
    .single();

  if (!assignment) throw new Error('Delivery not assigned to you');
  if (assignment.status !== 'assigned') throw new Error('Pickup already confirmed');

  // Get order to check high-value requirement and price review
  const { data: order } = await supabase
    .from('orders')
    .select('total, price_review_status')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Order not found');

  if (order.price_review_status === 'pending') {
    throw new Error('Order has items pending admin price approval — pickup blocked');
  }

  if (order.price_review_status === 'awaiting_customer') {
    throw new Error('Customer has not accepted the updated price — pickup blocked');
  }

  const isHighValue = order.total >= config.dispatch.highValueThreshold;
  if (isHighValue && config.dispatch.highValueRequiresPhoto && !pickupPhotoUrl) {
    throw new Error('Photo confirmation required for high-value orders');
  }

  const { error: assignmentUpdateError } = await supabase
    .from('order_assignments')
    .update({
      status: 'in_progress',
      pickup_confirmed_at: new Date().toISOString(),
      pickup_photo_url: pickupPhotoUrl || null,
    })
    .eq('id', assignment.id);
  throwIfSupabaseError(assignmentUpdateError, 'Failed to update rider assignment');

  // Update order status to dispatched
  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  throwIfSupabaseError(orderUpdateError, 'Failed to update order to dispatched');

  // Create initial delivery tracking record
  const { error: trackingError } = await supabase
    .from('delivery_tracking')
    .upsert(
      {
        order_id: orderId,
        rider_id: riderId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' }
    );

  if (trackingError) {
    console.error('Failed to create delivery tracking:', trackingError.message);
  }

  // Fire-and-forget notification
  notifyOrderDispatched(orderId).catch(() => {});

  await writeAuditLog({
    userId: riderId,
    action: AUDIT_ACTIONS.RIDER_PICKUP_CONFIRMED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Rider confirmed pickup — order dispatched', {
      pickupPhotoUrl: pickupPhotoUrl ?? null,
    }),
  });
}

export async function updateLocation(
  riderId: string,
  orderId: string,
  latitude: number,
  longitude: number,
  etaMinutes?: number
): Promise<void> {
  const supabase = await createClient();

  // Verify assignment is in_progress
  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('status')
    .eq('assignee_id', riderId)
    .eq('order_id', orderId)
    .eq('role', 'rider')
    .eq('status', 'in_progress')
    .single();

  if (!assignment) throw new Error('No active delivery for this order');

  // Upsert tracking record
  await supabase
    .from('delivery_tracking')
    .upsert(
      {
        order_id: orderId,
        rider_id: riderId,
        current_latitude: latitude,
        current_longitude: longitude,
        eta_minutes: etaMinutes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' }
    );

  // Notify customer when nearby
  if (etaMinutes !== undefined && etaMinutes <= 5 && etaMinutes > 0) {
    notifyOrderNearby(orderId, etaMinutes).catch(() => {});
  }
}

export async function confirmDelivery(
  riderId: string,
  orderId: string,
  data: { photoUrl?: string; codAmountCollected?: number }
): Promise<void> {
  const supabase = await createClient();

  // Verify assignment is in_progress
  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('id, status')
    .eq('assignee_id', riderId)
    .eq('order_id', orderId)
    .eq('role', 'rider')
    .eq('status', 'in_progress')
    .single();

  if (!assignment) throw new Error('No active delivery for this order');

  // Get order details
  const { data: order } = await supabase
    .from('orders')
    .select('total, payment_method, payment_status, customer_id, created_at')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Order not found');

  // If COD, update payment status
  if (order.payment_method === 'cod' && order.payment_status !== 'paid') {
    const { error: codError } = await supabase
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('id', orderId);
    throwIfSupabaseError(codError, 'Failed to update COD payment status');

    // Update customer lifetime spend
    await supabase.rpc('increment_lifetime_spend', {
      p_user_id: order.customer_id,
      p_amount: order.total,
    }).then(({ error }) => {
      // Fallback if RPC doesn't exist
      if (error) {
        supabase
          .from('users')
          .select('lifetime_spend, total_orders')
          .eq('id', order.customer_id)
          .single()
          .then(({ data: customer }) => {
            if (customer) {
              supabase
                .from('users')
                .update({
                  lifetime_spend: customer.lifetime_spend + order.total,
                  total_orders: customer.total_orders + 1,
                })
                .eq('id', order.customer_id);
            }
          });
      }
    });
  }

  const { count } = await supabase
    .from('delivery_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId);

  const { error: attemptError } = await supabase.from('delivery_attempts').insert({
    order_id: orderId,
    rider_id: riderId,
    attempt_number: (count ?? 0) + 1,
    status: 'completed',
    photo_url: data.photoUrl || null,
  });
  throwIfSupabaseError(attemptError, 'Failed to record delivery attempt');

  // Update assignment to completed
  const { error: assignmentCompleteError } = await supabase
    .from('order_assignments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', assignment.id);
  throwIfSupabaseError(assignmentCompleteError, 'Failed to complete rider assignment');

  // Calculate actual delivery minutes
  const createdAt = new Date(order.created_at);
  const now = new Date();
  const actualMinutes = Math.round((now.getTime() - createdAt.getTime()) / 60000);

  const { error: deliveredError } = await supabase
    .from('orders')
    .update({
      status: 'delivered',
      delivered_at: now.toISOString(),
      actual_delivery_minutes: actualMinutes,
    })
    .eq('id', orderId);
  throwIfSupabaseError(deliveredError, 'Failed to mark order as delivered');

  // Fire-and-forget notification
  notifyOrderDelivered(orderId).catch(() => {});

  // Update customer stats for non-COD (COD handled above)
  if (order.payment_method !== 'cod') {
    const { data: customer } = await supabase
      .from('users')
      .select('total_orders')
      .eq('id', order.customer_id)
      .single();

    if (customer) {
      await supabase
        .from('users')
        .update({
          total_orders: customer.total_orders + 1,
        })
        .eq('id', order.customer_id);
    }
  }

  await writeAuditLog({
    userId: riderId,
    action: AUDIT_ACTIONS.RIDER_DELIVERY_COMPLETED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Rider confirmed delivery — order delivered', {
      paymentMethod: order.payment_method,
      codAmountCollected: data.codAmountCollected ?? null,
      actualDeliveryMinutes: actualMinutes,
    }),
  });
}

export async function reportDeliveryFailure(
  riderId: string,
  orderId: string,
  data: ReportDeliveryFailureInput
): Promise<{ outcome: 'retry' | 'admin_review' | 'terminal' }> {
  return reportDeliveryFailureCore(riderId, orderId, data);
}

// ===== History =====

export async function getRiderHistory(
  riderId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ deliveries: RiderHistoryEntry[]; total: number }> {
  const supabase = await createClient();

  // Get completed/failed assignments
  const { data: assignments, count, error } = await supabase
    .from('order_assignments')
    .select('order_id, status, completed_at', { count: 'exact' })
    .eq('assignee_id', riderId)
    .eq('role', 'rider')
    .in('status', ['completed', 'failed'])
    .order('completed_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error || !assignments || assignments.length === 0) {
    return { deliveries: [], total: count ?? 0 };
  }

  const orderIds = assignments.map((a) => a.order_id);

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, delivery_address, payment_method, delivered_at')
    .in('id', orderIds);

  if (!orders) return { deliveries: [], total: count ?? 0 };

  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const assignmentMap = new Map(assignments.map((a) => [a.order_id, a]));

  const deliveries = orderIds
    .map((orderId) => {
      const order = orderMap.get(orderId);
      const assignment = assignmentMap.get(orderId);
      if (!order || !assignment) return null;

      return {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total: order.total,
        delivery_address: order.delivery_address,
        payment_method: order.payment_method,
        assignment_status: assignment.status,
        completed_at: assignment.completed_at,
        delivered_at: order.delivered_at,
      };
    })
    .filter(Boolean) as RiderHistoryEntry[];

  return { deliveries, total: count ?? 0 };
}
