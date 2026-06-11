import { createClient } from '@/lib/supabase/server';
import { refundOrderPayment } from './order-refund';
import { clearDeliveryEscalation, markPartsReturnedToHub } from './delivery-failure';
import { notifyOrderCancelled } from './notifications';
import { writeAuditLog, auditDetails } from './audit-log';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import {
  sendPriceChangeToCustomer,
  rejectPriceReviewItem,
} from './price-review';
import { canAdminReassignRider } from '@/lib/constants/order-status';
import {
  AUDIT_ACTION_LEGACY_ALIASES,
  formatAuditEntityDetail,
  formatAuditEntityLabel,
  getAuditEntityHref,
  isAuditActionPrefixFilter,
  type AuditEntityContext,
} from '@/lib/constants/audit-log';
import type { OrderStatus } from '@/lib/types/database';
import type { AttentionType } from '@/lib/constants/admin-attention';
import {
  enrichAttentionOrdersWithCustomers,
  getAdminAttentionInbox,
  getAdminOrdersByAttention,
} from './admin-attention';

// ============================================
// DASHBOARD
// ============================================

export async function getDashboardStats() {
  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Today's orders
  const { count: todayOrderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString());

  // Today's revenue
  const { data: todayRevenue } = await supabase
    .from('orders')
    .select('total')
    .gte('created_at', todayStart.toISOString())
    .eq('payment_status', 'paid');

  const totalRevenue = todayRevenue?.reduce((sum, o) => sum + o.total, 0) ?? 0;

  // Active orders by status
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('status')
    .in('status', ['pending', 'confirmed', 'sourcing', 'picked', 'dispatched']);

  const activeByStatus: Record<string, number> = {};
  if (activeOrders) {
    for (const o of activeOrders) {
      activeByStatus[o.status] = (activeByStatus[o.status] || 0) + 1;
    }
  }
  const totalActive = activeOrders?.length ?? 0;

  const attention = await getAdminAttentionInbox(supabase);
  const slaGroup = attention.groups.find((g) => g.type === 'sla_breach');
  const priceReviewGroup = attention.groups.find((g) => g.type === 'price_review');
  const slaBreachCount = slaGroup?.count ?? 0;
  const priceReviewPendingCount = priceReviewGroup?.count ?? 0;

  // Active runners (with active shift)
  const { count: activeRunnerCount } = await supabase
    .from('runner_shifts')
    .select('*', { count: 'exact', head: true })
    .is('ended_at', null);

  // Active riders (with active assignments)
  const { data: activeRiderAssignments } = await supabase
    .from('order_assignments')
    .select('assignee_id')
    .eq('role', 'rider')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  const activeRiderIds = new Set(
    activeRiderAssignments?.map((a) => a.assignee_id) ?? []
  );

  // Recent 10 orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, payment_status, created_at, customer_id')
    .order('created_at', { ascending: false })
    .limit(10);

  // Get customer names for recent orders
  let recentOrdersWithCustomer = recentOrders ?? [];
  if (recentOrders && recentOrders.length > 0) {
    const customerIds = [...new Set(recentOrders.map((o) => o.customer_id))];
    const { data: customers } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', customerIds);

    const customerMap: Record<string, string> = {};
    customers?.forEach((c) => {
      customerMap[c.id] = c.full_name;
    });

    recentOrdersWithCustomer = recentOrders.map((o) => ({
      ...o,
      customer_name: customerMap[o.customer_id] ?? 'Unknown',
    }));
  }

  return {
    todayOrderCount: todayOrderCount ?? 0,
    todayRevenue: totalRevenue,
    totalActive,
    activeByStatus,
    slaBreachCount,
    priceReviewPendingCount,
    attention,
    activeRunnerCount: activeRunnerCount ?? 0,
    activeRiderCount: activeRiderIds.size,
    recentOrders: recentOrdersWithCustomer,
  };
}

// ============================================
// ORDERS
// ============================================

export async function getAdminOrders(filters: {
  page: number;
  limit: number;
  status?: OrderStatus;
  search?: string;
  priceReviewPending?: boolean;
  attention?: AttentionType;
}) {
  const supabase = await createClient();
  const { page, limit, status, search, priceReviewPending, attention } = filters;

  if (attention) {
    const { orders, total } = await getAdminOrdersByAttention(
      supabase,
      attention,
      page,
      limit
    );
    const ordersWithCustomer = await enrichAttentionOrdersWithCustomers(
      supabase,
      orders
    );
    return { orders: ordersWithCustomer, total };
  }

  const offset = (page - 1) * limit;

  let query = supabase
    .from('orders')
    .select(
      'id, order_number, status, total, payment_method, payment_status, created_at, customer_id, source_channel, price_review_status',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (priceReviewPending) {
    query = query.eq('price_review_status', 'pending');
  }

  if (search) {
    query = query.ilike('order_number', `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  // Get customer names
  const orders = data ?? [];
  let ordersWithCustomer = orders;
  if (orders.length > 0) {
    const customerIds = [...new Set(orders.map((o) => o.customer_id))];
    const { data: customers } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', customerIds);

    const customerMap: Record<string, string> = {};
    customers?.forEach((c) => {
      customerMap[c.id] = c.full_name;
    });

    ordersWithCustomer = orders.map((o) => ({
      ...o,
      customer_name: customerMap[o.customer_id] ?? 'Unknown',
    }));
  }

  return {
    orders: ordersWithCustomer,
    total: count ?? 0,
  };
}

export async function getAdminOrderDetail(orderId: string) {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('Order not found');

  // Get order items
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  // Get assignments
  const { data: assignments } = await supabase
    .from('order_assignments')
    .select('*')
    .eq('order_id', orderId)
    .order('assigned_at', { ascending: false });

  // Get assignee names
  let assignmentsWithNames = assignments ?? [];
  if (assignments && assignments.length > 0) {
    const assigneeIds = assignments.map((a) => a.assignee_id);
    const { data: assignees } = await supabase
      .from('users')
      .select('id, full_name, phone')
      .in('id', assigneeIds);

    const assigneeMap: Record<string, { name: string; phone: string }> = {};
    assignees?.forEach((a) => {
      assigneeMap[a.id] = { name: a.full_name, phone: a.phone };
    });

    assignmentsWithNames = assignments.map((a) => ({
      ...a,
      assignee_name: assigneeMap[a.assignee_id]?.name ?? 'Unknown',
      assignee_phone: assigneeMap[a.assignee_id]?.phone ?? '',
    }));
  }

  // Get customer info
  const { data: customer } = await supabase
    .from('users')
    .select('id, full_name, phone, email, loyalty_tier')
    .eq('id', order.customer_id)
    .single();

  // Get delivery tracking
  const { data: tracking } = await supabase
    .from('delivery_tracking')
    .select('*')
    .eq('order_id', orderId)
    .single();

  // Get delivery attempts
  const { data: deliveryAttempts } = await supabase
    .from('delivery_attempts')
    .select('*')
    .eq('order_id', orderId)
    .order('attempted_at', { ascending: false });

  // Get payment events
  const { data: paymentEvents } = await supabase
    .from('payment_events')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  const { data: priceIncidents } = await supabase
    .from('vendor_incidents')
    .select('*')
    .eq('order_id', orderId)
    .eq('type', 'price_discrepancy')
    .order('created_at', { ascending: false });

  return {
    ...order,
    items: items ?? [],
    assignments: assignmentsWithNames,
    customer,
    tracking,
    deliveryAttempts: deliveryAttempts ?? [],
    paymentEvents: paymentEvents ?? [],
    priceIncidents: priceIncidents ?? [],
  };
}

export async function resolvePriceReview(
  adminId: string,
  orderId: string,
  itemId: string,
  action: 'send_to_customer' | 'reject_item',
  notes?: string
) {
  const supabase = await createClient();

  if (action === 'send_to_customer') {
    const result = await sendPriceChangeToCustomer(
      supabase,
      orderId,
      itemId,
      adminId,
      notes
    );
    return { action: 'sent_to_customer' as const, ...result };
  }

  await rejectPriceReviewItem(supabase, orderId, itemId, adminId, notes);
  return { action: 'rejected' as const };
}

export async function reassignOrder(
  orderId: string,
  role: 'runner' | 'rider',
  newAssigneeId: string,
  adminId?: string
) {
  const supabase = await createClient();

  if (role === 'rider') {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error('Order not found');

    if (!canAdminReassignRider(order.status as OrderStatus)) {
      throw new Error('Cannot reassign rider for a completed or cancelled order');
    }
  }

  // Fail current assignment of that role
  await supabase
    .from('order_assignments')
    .update({ status: 'failed' })
    .eq('order_id', orderId)
    .eq('role', role)
    .in('status', ['assigned', 'accepted', 'in_progress']);

  // Create new assignment
  const { data, error } = await supabase
    .from('order_assignments')
    .insert({
      order_id: orderId,
      assignee_id: newAssigneeId,
      role,
      status: 'assigned',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.ASSIGNMENT_REASSIGNED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails(`Admin reassigned ${role} on order`, {
      role,
      newAssigneeId,
      assignmentId: data.id,
    }),
  });

  if (role === 'rider') {
    await clearDeliveryEscalation(orderId, adminId);
  }

  return data;
}

export async function adminMarkPartsReturned(
  orderId: string,
  partsRecoveryRate?: number,
  adminId?: string
) {
  await markPartsReturnedToHub(orderId, partsRecoveryRate, adminId);
  return { success: true };
}

export async function adminCancelOrder(
  orderId: string,
  reason: string,
  adminId?: string
) {
  const supabase = await createClient();

  // Get order
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, customer_id, total, payment_status, status, order_number')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) throw new Error('Order not found');

  if (['delivered', 'cancelled'].includes(order.status)) {
    throw new Error('Cannot cancel order in current status');
  }

  // Update order
  await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      internal_notes: reason,
    })
    .eq('id', orderId);

  // Fail active assignments
  await supabase
    .from('order_assignments')
    .update({ status: 'failed' })
    .eq('order_id', orderId)
    .in('status', ['assigned', 'accepted', 'in_progress']);

  // Auto-refund if paid
  if (order.payment_status === 'paid') {
    await processRefund(orderId, adminId);
  }

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.ORDER_CANCELLED_ADMIN,
    entityType: 'order',
    entityId: orderId,
    oldValues: { status: order.status, paymentStatus: order.payment_status },
    newValues: auditDetails(`Admin cancelled ${order.order_number}`, {
      orderNumber: order.order_number,
      reason,
      refunded: order.payment_status === 'paid',
    }),
  });

  // Fire-and-forget notification
  notifyOrderCancelled(orderId, reason).catch(() => {});

  return { success: true };
}

export async function processRefund(orderId: string, adminId?: string) {
  const result = await refundOrderPayment(orderId, undefined, adminId);
  if (!result.refunded) {
    throw new Error('Order is not eligible for refund');
  }
  return { success: true, amount: result.amount };
}

// ============================================
// RUNNERS
// ============================================

export async function getAdminRunners(filters: {
  page: number;
  limit: number;
  search?: string;
}) {
  const supabase = await createClient();
  const { page, limit, search } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('users')
    .select('id, full_name, phone, is_active, created_at', { count: 'exact' })
    .eq('user_type', 'runner')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const runners = data ?? [];
  if (runners.length === 0) return { runners: [], total: 0 };

  const runnerIds = runners.map((r) => r.id);

  // Get floats
  const { data: floats } = await supabase
    .from('runner_floats')
    .select('runner_id, balance')
    .in('runner_id', runnerIds);

  const floatMap: Record<string, number> = {};
  floats?.forEach((f) => {
    floatMap[f.runner_id] = f.balance;
  });

  // Get active shifts
  const { data: shifts } = await supabase
    .from('runner_shifts')
    .select('runner_id, started_at, commission_earned')
    .in('runner_id', runnerIds)
    .is('ended_at', null);

  const shiftMap: Record<string, { onShift: boolean; commission: number }> = {};
  shifts?.forEach((s) => {
    shiftMap[s.runner_id] = { onShift: true, commission: s.commission_earned };
  });

  // Get active order counts
  const { data: assignments } = await supabase
    .from('order_assignments')
    .select('assignee_id')
    .in('assignee_id', runnerIds)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  const orderCountMap: Record<string, number> = {};
  assignments?.forEach((a) => {
    orderCountMap[a.assignee_id] = (orderCountMap[a.assignee_id] || 0) + 1;
  });

  const runnersWithData = runners.map((r) => ({
    ...r,
    float_balance: floatMap[r.id] ?? 0,
    on_shift: shiftMap[r.id]?.onShift ?? false,
    today_commission: shiftMap[r.id]?.commission ?? 0,
    active_orders: orderCountMap[r.id] ?? 0,
  }));

  return { runners: runnersWithData, total: count ?? 0 };
}

export async function getAdminRunnerDetail(runnerId: string) {
  const supabase = await createClient();

  const { data: runner, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', runnerId)
    .eq('user_type', 'runner')
    .single();

  if (error || !runner) throw new Error('Runner not found');

  // Float
  const { data: float } = await supabase
    .from('runner_floats')
    .select('*')
    .eq('runner_id', runnerId)
    .single();

  // Current shift
  const { data: currentShift } = await supabase
    .from('runner_shifts')
    .select('*')
    .eq('runner_id', runnerId)
    .is('ended_at', null)
    .single();

  // Recent shifts
  const { data: recentShifts } = await supabase
    .from('runner_shifts')
    .select('*')
    .eq('runner_id', runnerId)
    .order('started_at', { ascending: false })
    .limit(10);

  // Recent orders
  const { data: recentAssignments } = await supabase
    .from('order_assignments')
    .select('order_id, status, assigned_at, completed_at')
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .order('assigned_at', { ascending: false })
    .limit(10);

  return {
    ...runner,
    float,
    currentShift,
    recentShifts: recentShifts ?? [],
    recentAssignments: recentAssignments ?? [],
  };
}

export async function topUpRunnerFloat(
  runnerId: string,
  amount: number,
  adminId?: string
) {
  const supabase = await createClient();

  // Upsert float record
  const { data: existing } = await supabase
    .from('runner_floats')
    .select('id, balance')
    .eq('runner_id', runnerId)
    .single();

  if (existing) {
    await supabase
      .from('runner_floats')
      .update({
        balance: existing.balance + amount,
        last_topped_up: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('runner_floats').insert({
      runner_id: runnerId,
      balance: amount,
      last_topped_up: new Date().toISOString(),
    });
  }

  const newBalance = (existing?.balance ?? 0) + amount;

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.RUNNER_FLOAT_TOPPED_UP,
    entityType: 'user',
    entityId: runnerId,
    newValues: auditDetails(`Runner float topped up by ₦${amount.toLocaleString('en-NG')}`, {
      amount,
      newBalance,
    }),
  });

  return { success: true, newBalance };
}

// ============================================
// RIDERS
// ============================================

export async function getAdminRiders(filters: { page: number; limit: number }) {
  const supabase = await createClient();
  const { page, limit } = filters;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('users')
    .select('id, full_name, phone, is_active, created_at', { count: 'exact' })
    .eq('user_type', 'rider')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const riders = data ?? [];
  if (riders.length === 0) return { riders: [], total: 0 };

  const riderIds = riders.map((r) => r.id);

  // Active deliveries
  const { data: activeAssignments } = await supabase
    .from('order_assignments')
    .select('assignee_id')
    .in('assignee_id', riderIds)
    .eq('role', 'rider')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  const activeCountMap: Record<string, number> = {};
  activeAssignments?.forEach((a) => {
    activeCountMap[a.assignee_id] = (activeCountMap[a.assignee_id] || 0) + 1;
  });

  // Total completed
  const { data: completedAssignments } = await supabase
    .from('order_assignments')
    .select('assignee_id')
    .in('assignee_id', riderIds)
    .eq('role', 'rider')
    .eq('status', 'completed');

  const completedCountMap: Record<string, number> = {};
  completedAssignments?.forEach((a) => {
    completedCountMap[a.assignee_id] =
      (completedCountMap[a.assignee_id] || 0) + 1;
  });

  const ridersWithData = riders.map((r) => ({
    ...r,
    active_deliveries: activeCountMap[r.id] ?? 0,
    total_completed: completedCountMap[r.id] ?? 0,
  }));

  return { riders: ridersWithData, total: count ?? 0 };
}

export async function getAdminRiderDetail(riderId: string) {
  const supabase = await createClient();

  const { data: rider, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', riderId)
    .eq('user_type', 'rider')
    .single();

  if (error || !rider) throw new Error('Rider not found');

  // Active deliveries
  const { data: activeDeliveries } = await supabase
    .from('order_assignments')
    .select('order_id, status, assigned_at')
    .eq('assignee_id', riderId)
    .eq('role', 'rider')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  // Recent history
  const { data: recentHistory } = await supabase
    .from('order_assignments')
    .select('order_id, status, assigned_at, completed_at')
    .eq('assignee_id', riderId)
    .eq('role', 'rider')
    .order('assigned_at', { ascending: false })
    .limit(20);

  return {
    ...rider,
    activeDeliveries: activeDeliveries ?? [],
    recentHistory: recentHistory ?? [],
  };
}

// ============================================
// VENDORS
// ============================================

export async function getAdminVendors(filters: {
  page: number;
  limit: number;
  clusterId?: string;
}) {
  const supabase = await createClient();
  const { page, limit, clusterId } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('vendors')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (clusterId) {
    query = query.eq('cluster_id', clusterId);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  // Get cluster names
  const vendors = data ?? [];
  if (vendors.length > 0) {
    const clusterIds = [...new Set(vendors.map((v) => v.cluster_id))];
    const { data: clusters } = await supabase
      .from('clusters')
      .select('id, name')
      .in('id', clusterIds);

    const clusterMap: Record<string, string> = {};
    clusters?.forEach((c) => {
      clusterMap[c.id] = c.name;
    });

    const vendorsWithCluster = vendors.map((v) => ({
      ...v,
      cluster_name: clusterMap[v.cluster_id] ?? 'Unknown',
    }));

    return { vendors: vendorsWithCluster, total: count ?? 0 };
  }

  return { vendors: [], total: 0 };
}

export async function createVendor(
  data: {
    name: string;
    contact_phone: string;
    contact_name?: string;
    cluster_id: string;
    location_in_market?: string;
    specializations?: string[];
    payment_terms?: string;
  },
  adminId?: string
) {
  const supabase = await createClient();

  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      name: data.name,
      contact_phone: data.contact_phone,
      contact_name: data.contact_name ?? null,
      cluster_id: data.cluster_id,
      location_in_market: data.location_in_market ?? null,
      specializations: data.specializations ?? [],
      payment_terms: data.payment_terms ?? 'cash',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.VENDOR_CREATED,
    entityType: 'vendor',
    entityId: vendor.id,
    newValues: auditDetails(`Vendor created — ${vendor.name}`, {
      name: vendor.name,
      clusterId: vendor.cluster_id,
    }),
  });

  return vendor;
}

export async function updateVendor(
  vendorId: string,
  data: Record<string, unknown>,
  adminId?: string
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .single();

  const { data: vendor, error } = await supabase
    .from('vendors')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', vendorId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.VENDOR_UPDATED,
    entityType: 'vendor',
    entityId: vendorId,
    oldValues: existing ? (existing as Record<string, unknown>) : null,
    newValues: auditDetails(`Vendor updated — ${vendor.name}`, { changes: data }),
  });

  return vendor;
}

export async function getAdminParts(filters: {
  page: number;
  limit: number;
  search?: string;
  category?: string;
}) {
  const supabase = await createClient();
  const { page, limit, search, category } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('parts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,oem_code.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const parts = data ?? [];
  if (parts.length === 0) return { parts: [], total: 0 };

  // Get vendor counts from vendor_parts
  const partIds = parts.map((p: { id: string }) => p.id);
  const { data: vendorPartRows } = await supabase
    .from('vendor_parts')
    .select('part_id')
    .in('part_id', partIds);

  const vendorCountMap: Record<string, number> = {};
  vendorPartRows?.forEach((vp: { part_id: string }) => {
    vendorCountMap[vp.part_id] = (vendorCountMap[vp.part_id] || 0) + 1;
  });

  const partsWithVendorCount = parts.map((p: { id: string }) => ({
    ...p,
    vendor_count: vendorCountMap[p.id] ?? 0,
  }));

  return { parts: partsWithVendorCount, total: count ?? 0 };
}

export async function createPart(
  data: {
    name: string;
    category: string;
    subcategory?: string;
    oem_code?: string;
    average_price?: number;
    weight_kg?: number;
    image_url?: string;
    compatible_vehicles?: Array<{
      make: string;
      model: string;
      year_start?: number;
      year_end?: number;
      spec?: string;
    }>;
  },
  adminId?: string
) {
  const supabase = await createClient();

  const { data: part, error } = await supabase
    .from('parts')
    .insert({
      name: data.name,
      category: data.category,
      subcategory: data.subcategory ?? null,
      oem_code: data.oem_code ?? null,
      average_price: data.average_price ?? null,
      weight_kg: data.weight_kg ?? null,
      image_url: data.image_url ?? null,
      compatible_vehicles: data.compatible_vehicles ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.PART_CREATED,
    entityType: 'part',
    entityId: part.id,
    newValues: auditDetails(`Part created — ${part.name}`, {
      name: part.name,
      category: part.category,
    }),
  });

  return part;
}

export async function updatePart(
  partId: string,
  data: Record<string, unknown>,
  adminId?: string
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('parts')
    .select('*')
    .eq('id', partId)
    .single();

  const { data: part, error } = await supabase
    .from('parts')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', partId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.PART_UPDATED,
    entityType: 'part',
    entityId: partId,
    oldValues: existing ? (existing as Record<string, unknown>) : null,
    newValues: auditDetails(`Part updated — ${part.name}`, { changes: data }),
  });

  return part;
}

// ============================================
// CUSTOMERS
// ============================================

export async function getAdminCustomers(filters: {
  page: number;
  limit: number;
  search?: string;
  tier?: string;
}) {
  const supabase = await createClient();
  const { page, limit, search, tier } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('users')
    .select('id, full_name, phone, user_type, loyalty_tier, total_orders, lifetime_spend, is_active, created_at', {
      count: 'exact',
    })
    .in('user_type', ['mechanic', 'car_owner'])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  if (tier) {
    query = query.eq('loyalty_tier', tier);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const customers = data ?? [];
  if (customers.length === 0) return { customers: [], total: 0 };

  // Get wallet balances
  const customerIds = customers.map((c) => c.id);
  const { data: wallets } = await supabase
    .from('wallets')
    .select('user_id, balance')
    .in('user_id', customerIds);

  const walletMap: Record<string, number> = {};
  wallets?.forEach((w) => {
    walletMap[w.user_id] = w.balance;
  });

  const customersWithWallet = customers.map((c) => ({
    ...c,
    wallet_balance: walletMap[c.id] ?? 0,
  }));

  return { customers: customersWithWallet, total: count ?? 0 };
}

export async function getAdminCustomerDetail(customerId: string) {
  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error || !customer) throw new Error('Customer not found');

  // Wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', customerId)
    .single();

  // Recent orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    ...customer,
    wallet,
    recentOrders: recentOrders ?? [],
  };
}

// ============================================
// PAYMENTS
// ============================================

export async function getAdminPayments(filters: {
  page: number;
  limit: number;
  type?: string;
  status?: string;
}) {
  const supabase = await createClient();
  const { page, limit, type, status } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('payment_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { payments: data ?? [], total: count ?? 0 };
}

// ============================================
// ANALYTICS
// ============================================

export async function getAnalytics(period: 'week' | 'month') {
  const supabase = await createClient();
  const periodStart = new Date();
  if (period === 'week') {
    periodStart.setDate(periodStart.getDate() - 7);
  } else {
    periodStart.setMonth(periodStart.getMonth() - 1);
  }

  // Order counts
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', periodStart.toISOString());

  const { count: deliveredOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', periodStart.toISOString())
    .eq('status', 'delivered');

  // Revenue
  const { data: revenueData } = await supabase
    .from('orders')
    .select('total')
    .gte('created_at', periodStart.toISOString())
    .eq('payment_status', 'paid');

  const totalRevenue = revenueData?.reduce((sum, o) => sum + o.total, 0) ?? 0;

  // Average delivery time
  const { data: deliveredData } = await supabase
    .from('orders')
    .select('actual_delivery_minutes')
    .gte('created_at', periodStart.toISOString())
    .eq('status', 'delivered')
    .not('actual_delivery_minutes', 'is', null);

  const avgDeliveryTime =
    deliveredData && deliveredData.length > 0
      ? Math.round(
          deliveredData.reduce(
            (sum, o) => sum + (o.actual_delivery_minutes ?? 0),
            0
          ) / deliveredData.length
        )
      : 0;

  // Success rate
  const successRate =
    totalOrders && totalOrders > 0
      ? Math.round(((deliveredOrders ?? 0) / totalOrders) * 100)
      : 0;

  // Top runners
  const { data: runnerAssignments } = await supabase
    .from('order_assignments')
    .select('assignee_id')
    .eq('role', 'runner')
    .eq('status', 'completed')
    .gte('completed_at', periodStart.toISOString());

  const runnerCounts: Record<string, number> = {};
  runnerAssignments?.forEach((a) => {
    runnerCounts[a.assignee_id] = (runnerCounts[a.assignee_id] || 0) + 1;
  });

  const topRunnerIds = Object.entries(runnerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id);

  let topRunners: Array<{
    name: string;
    orders_completed: number;
    commission: number;
  }> = [];
  if (topRunnerIds.length > 0) {
    const { data: runnerUsers } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', topRunnerIds);

    const nameMap: Record<string, string> = {};
    runnerUsers?.forEach((u) => {
      nameMap[u.id] = u.full_name;
    });

    topRunners = topRunnerIds.map((id) => ({
      name: nameMap[id] ?? 'Unknown',
      orders_completed: runnerCounts[id],
      commission: runnerCounts[id] * 600,
    }));
  }

  // Top vendors by reliability
  const { data: topVendors } = await supabase
    .from('vendors')
    .select('name, reliability_score, total_orders')
    .eq('is_active', true)
    .order('reliability_score', { ascending: false })
    .limit(5);

  return {
    totalOrders: totalOrders ?? 0,
    deliveredOrders: deliveredOrders ?? 0,
    totalRevenue,
    avgDeliveryTime,
    successRate,
    topRunners,
    topVendors: topVendors ?? [],
  };
}

// ============================================
// RECONCILIATION
// ============================================

export async function getReconciliation(date?: string) {
  const supabase = await createClient();
  const targetDate = date ? new Date(date) : new Date();
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: shifts } = await supabase
    .from('runner_shifts')
    .select('*')
    .gte('started_at', dayStart.toISOString())
    .lte('started_at', dayEnd.toISOString())
    .order('started_at', { ascending: false });

  if (!shifts || shifts.length === 0) return { shifts: [], summary: null };

  // Get runner names
  const runnerIds = [...new Set(shifts.map((s) => s.runner_id))];
  const { data: runners } = await supabase
    .from('users')
    .select('id, full_name')
    .in('id', runnerIds);

  const nameMap: Record<string, string> = {};
  runners?.forEach((r) => {
    nameMap[r.id] = r.full_name;
  });

  const shiftsWithNames = shifts.map((s) => ({
    ...s,
    runner_name: nameMap[s.runner_id] ?? 'Unknown',
  }));

  const totalSourced = shifts.reduce((sum, s) => sum + s.total_sourced, 0);
  const totalCommission = shifts.reduce(
    (sum, s) => sum + s.commission_earned,
    0
  );
  const totalDiscrepancy = shifts.reduce(
    (sum, s) => sum + (s.discrepancy_amount ?? 0),
    0
  );
  const unreconciledCount = shifts.filter((s) => !s.is_reconciled).length;

  return {
    shifts: shiftsWithNames,
    summary: {
      totalShifts: shifts.length,
      totalSourced,
      totalCommission,
      totalDiscrepancy,
      unreconciledCount,
    },
  };
}

// ============================================
// SETTINGS
// ============================================

export async function getSystemConfig() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .order('key');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateSystemConfig(
  key: string,
  value: unknown,
  adminId: string
) {
  const supabase = await createClient();

  const { data: previous } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  const { data, error } = await supabase
    .from('system_config')
    .upsert(
      {
        key,
        value: JSON.parse(JSON.stringify(value)),
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      },
      { onConflict: 'key' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: adminId,
    action: AUDIT_ACTIONS.SYSTEM_CONFIG_UPDATED,
    entityType: 'system_config',
    entityId: null,
    oldValues: previous ? { key, value: previous.value } : { key, value: null },
    newValues: auditDetails(`Config updated — ${key}`, { key, value }),
  });

  return data;
}

// ============================================
// HELPERS for reassignment
// ============================================

export async function getAvailableRunners(clusterId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('users')
    .select('id, full_name, phone')
    .eq('user_type', 'runner')
    .eq('is_active', true);

  if (clusterId) {
    query = query.eq('cluster_id', clusterId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getAvailableRiders(clusterId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('users')
    .select('id, full_name, phone')
    .eq('user_type', 'rider')
    .eq('is_active', true);

  if (clusterId) {
    query = query.eq('cluster_id', clusterId);
  }

  const { data } = await query;
  return data ?? [];
}

// ============================================
// AUDIT LOG
// ============================================

export async function getAuditLog(filters: {
  page: number;
  limit: number;
  entityType?: string;
  action?: string;
  search?: string;
}) {
  const supabase = await createClient();
  const { page, limit, entityType, action, search } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  if (action) {
    if (isAuditActionPrefixFilter(action)) {
      query = query.ilike('action', `${action}%`);
    } else {
      const legacy = AUDIT_ACTION_LEGACY_ALIASES[action] ?? [];
      if (legacy.length > 0) {
        query = query.or(`action.eq.${action},action.in.(${legacy.join(',')})`);
      } else {
        query = query.eq('action', action);
      }
    }
  }

  if (search) {
    query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const entries = data ?? [];
  if (entries.length === 0) return { entries: [], total: count ?? 0 };

  const userIds = [...new Set(entries.map((e) => e.user_id).filter(Boolean))] as string[];
  const { data: users } = userIds.length
    ? await supabase.from('users').select('id, full_name').in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string }> };

  const nameMap: Record<string, string> = {};
  users?.forEach((u) => {
    nameMap[u.id] = u.full_name;
  });

  const orderIds = [
    ...new Set(
      entries
        .filter((e) => e.entity_type === 'order' && e.entity_id)
        .map((e) => e.entity_id as string)
    ),
  ];
  const userEntityIds = [
    ...new Set(
      entries
        .filter((e) => e.entity_type === 'user' && e.entity_id)
        .map((e) => e.entity_id as string)
    ),
  ];

  const { data: orders } = orderIds.length
    ? await supabase
        .from('orders')
        .select('id, order_number, status')
        .in('id', orderIds)
    : { data: [] as Array<{ id: string; order_number: string; status: string }> };

  const { data: entityUsers } = userEntityIds.length
    ? await supabase
        .from('users')
        .select('id, full_name, phone')
        .in('id', userEntityIds)
    : { data: [] as Array<{ id: string; full_name: string; phone: string }> };

  const orderMap: Record<string, AuditEntityContext> = {};
  orders?.forEach((o) => {
    orderMap[o.id] = { orderNumber: o.order_number, orderStatus: o.status };
  });

  const userEntityMap: Record<string, AuditEntityContext> = {};
  entityUsers?.forEach((u) => {
    userEntityMap[u.id] = { userName: u.full_name, userPhone: u.phone };
  });

  const vendorIds = [
    ...new Set(
      entries
        .filter((e) => e.entity_type === 'vendor' && e.entity_id)
        .map((e) => e.entity_id as string)
    ),
  ];
  const partIds = [
    ...new Set(
      entries
        .filter((e) => e.entity_type === 'part' && e.entity_id)
        .map((e) => e.entity_id as string)
    ),
  ];
  const clusterIds = [
    ...new Set(
      entries
        .filter((e) => e.entity_type === 'cluster' && e.entity_id)
        .map((e) => e.entity_id as string)
    ),
  ];

  const { data: vendors } = vendorIds.length
    ? await supabase.from('vendors').select('id, name').in('id', vendorIds)
    : { data: [] as Array<{ id: string; name: string }> };

  const { data: parts } = partIds.length
    ? await supabase.from('parts').select('id, name').in('id', partIds)
    : { data: [] as Array<{ id: string; name: string }> };

  const { data: clusters } = clusterIds.length
    ? await supabase.from('clusters').select('id, name').in('id', clusterIds)
    : { data: [] as Array<{ id: string; name: string }> };

  const vendorMap: Record<string, AuditEntityContext> = {};
  vendors?.forEach((v) => {
    vendorMap[v.id] = { vendorName: v.name };
  });

  const partMap: Record<string, AuditEntityContext> = {};
  parts?.forEach((p) => {
    partMap[p.id] = { partName: p.name };
  });

  const clusterMap: Record<string, AuditEntityContext> = {};
  clusters?.forEach((c) => {
    clusterMap[c.id] = { clusterName: c.name };
  });

  return {
    entries: entries.map((entry) => {
      const newValues = entry.new_values as Record<string, unknown> | null;
      let entityContext: AuditEntityContext | undefined;

      if (entry.entity_type === 'order' && entry.entity_id) {
        entityContext = orderMap[entry.entity_id];
      } else if (entry.entity_type === 'user' && entry.entity_id) {
        entityContext = userEntityMap[entry.entity_id];
      } else if (entry.entity_type === 'vendor' && entry.entity_id) {
        entityContext = vendorMap[entry.entity_id];
      } else if (entry.entity_type === 'part' && entry.entity_id) {
        entityContext = partMap[entry.entity_id];
      } else if (entry.entity_type === 'cluster' && entry.entity_id) {
        entityContext = clusterMap[entry.entity_id];
      } else if (entry.entity_type === 'system_config') {
        const configKey =
          typeof newValues?.key === 'string'
            ? newValues.key
            : typeof entry.old_values === 'object' &&
                entry.old_values &&
                typeof (entry.old_values as Record<string, unknown>).key === 'string'
              ? ((entry.old_values as Record<string, unknown>).key as string)
              : undefined;
        entityContext = configKey ? { configKey } : undefined;
      }

      return {
        ...entry,
        user_name: entry.user_id ? nameMap[entry.user_id] ?? 'Unknown' : 'System',
        entity_label: formatAuditEntityLabel(
          entry.entity_type,
          entry.entity_id,
          entityContext
        ),
        entity_detail: formatAuditEntityDetail(entry.entity_type, entityContext),
        entity_href: getAuditEntityHref(entry.entity_type, entityContext),
      };
    }),
    total: count ?? 0,
  };
}

// ============================================
// CLUSTERS (MARKETS)
// ============================================

export async function getAdminClusters() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('clusters')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCluster(
  data: {
    name: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
    delivery_radius_km: number;
    is_active?: boolean;
  },
  adminId?: string
) {
  const supabase = await createClient();

  const { data: cluster, error } = await supabase
    .from('clusters')
    .insert({
      name: data.name,
      city: data.city,
      state: data.state,
      latitude: data.latitude,
      longitude: data.longitude,
      delivery_radius_km: data.delivery_radius_km,
      is_active: data.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.CLUSTER_CREATED,
    entityType: 'cluster',
    entityId: cluster.id,
    newValues: auditDetails(`Market created — ${cluster.name}`, {
      name: cluster.name,
      city: cluster.city,
      state: cluster.state,
    }),
  });

  return cluster;
}

export async function updateCluster(
  clusterId: string,
  data: Record<string, unknown>,
  adminId?: string
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('clusters')
    .select('*')
    .eq('id', clusterId)
    .single();

  const { data: cluster, error } = await supabase
    .from('clusters')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', clusterId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.CLUSTER_UPDATED,
    entityType: 'cluster',
    entityId: clusterId,
    oldValues: existing ? (existing as Record<string, unknown>) : null,
    newValues: auditDetails(`Market updated — ${cluster.name}`, { changes: data }),
  });

  return cluster;
}

export async function getPartVendors(partId: string) {
  const supabase = await createClient();

  const { data: part, error: partError } = await supabase
    .from('parts')
    .select('id, name')
    .eq('id', partId)
    .single();

  if (partError || !part) throw new Error('Part not found');

  const { data, error } = await supabase
    .from('vendor_parts')
    .select(
      'id, last_price, average_price, price_count, last_seen_at, vendors(id, name, contact_phone, location_in_market, cluster_id, clusters(name))'
    )
    .eq('part_id', partId)
    .order('last_seen_at', { ascending: false });

  if (error) throw new Error(error.message);

  return {
    part,
    vendors: (data ?? []).map((row) => {
      const rawVendor = row.vendors as unknown;
      const vendor = (Array.isArray(rawVendor) ? rawVendor[0] : rawVendor) as {
        id: string;
        name: string;
        contact_phone: string;
        location_in_market: string | null;
        cluster_id: string;
        clusters: { name: string } | { name: string }[] | null;
      } | null;

      const cluster = vendor?.clusters;
      const clusterName = Array.isArray(cluster) ? cluster[0]?.name : cluster?.name;

      return {
        id: row.id,
        last_price: row.last_price,
        average_price: row.average_price,
        price_count: row.price_count,
        last_seen_at: row.last_seen_at,
        vendor_id: vendor?.id ?? '',
        vendor_name: vendor?.name ?? 'Unknown',
        contact_phone: vendor?.contact_phone ?? '',
        location_in_market: vendor?.location_in_market,
        cluster_name: clusterName ?? '',
      };
    }),
  };
}
