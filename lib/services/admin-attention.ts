import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ATTENTION_PRIORITY,
  ATTENTION_TYPES,
  DASHBOARD_ATTENTION_PREVIEW_LIMIT,
  type AttentionType,
} from '@/lib/constants/admin-attention';
import { SETTLEMENT_STATUS } from '@/lib/utils/delivery-settlement';
import { DELIVERY_RESOLUTION } from '@/lib/constants/delivery-failure';
import type { OrderStatus } from '@/lib/types/database';

export interface AttentionOrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  customer_id: string;
  source_channel: string;
  price_review_status: string;
  minutes_overdue?: number;
  promised_delivery_minutes?: number;
}

export interface AttentionGroup {
  type: AttentionType;
  count: number;
  preview: AttentionOrderRow[];
  hasMore: boolean;
}

export interface AdminAttentionInbox {
  totalCount: number;
  groups: AttentionGroup[];
}

const ORDER_LIST_COLUMNS =
  'id, order_number, status, total, payment_method, payment_status, created_at, customer_id, source_channel, price_review_status, promised_delivery_minutes';

async function attachCustomerNames(
  supabase: SupabaseClient,
  orders: AttentionOrderRow[]
): Promise<Array<AttentionOrderRow & { customer_name: string }>> {
  if (orders.length === 0) return [];

  const customerIds = [...new Set(orders.map((o) => o.customer_id))];
  const { data: customers } = await supabase
    .from('users')
    .select('id, full_name')
    .in('id', customerIds);

  const customerMap: Record<string, string> = {};
  customers?.forEach((c) => {
    customerMap[c.id] = c.full_name;
  });

  return orders.map((o) => ({
    ...o,
    customer_name: customerMap[o.customer_id] ?? 'Unknown',
  }));
}

async function countPriceReviewPending(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('price_review_status', 'pending');
  return count ?? 0;
}

async function countSourcingEscalated(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .not('sourcing_escalated_at', 'is', null);
  return count ?? 0;
}

async function countDeliveryEscalated(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('delivery_resolution', DELIVERY_RESOLUTION.ADMIN_REVIEW)
    .eq('status', 'dispatched');
  return count ?? 0;
}

async function countSettlementPending(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['failed', 'rejected'])
    .in('settlement_status', [
      SETTLEMENT_STATUS.PENDING_PARTS,
      SETTLEMENT_STATUS.PENDING_APPROVAL,
    ]);
  return count ?? 0;
}

async function countSlaBreaches(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('admin_count_sla_breaches');
  if (error) {
    console.error('admin_count_sla_breaches failed:', error.message);
    return 0;
  }
  return Number(data ?? 0);
}

async function previewPriceReview(
  supabase: SupabaseClient,
  limit: number
): Promise<AttentionOrderRow[]> {
  const { data } = await supabase
    .from('orders')
    .select(ORDER_LIST_COLUMNS)
    .eq('price_review_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data ?? []) as AttentionOrderRow[];
}

async function previewSourcingEscalated(
  supabase: SupabaseClient,
  limit: number
): Promise<AttentionOrderRow[]> {
  const { data } = await supabase
    .from('orders')
    .select(ORDER_LIST_COLUMNS)
    .not('sourcing_escalated_at', 'is', null)
    .order('sourcing_escalated_at', { ascending: true })
    .limit(limit);
  return (data ?? []) as AttentionOrderRow[];
}

async function previewDeliveryEscalated(
  supabase: SupabaseClient,
  limit: number
): Promise<AttentionOrderRow[]> {
  const { data } = await supabase
    .from('orders')
    .select(ORDER_LIST_COLUMNS)
    .eq('delivery_resolution', DELIVERY_RESOLUTION.ADMIN_REVIEW)
    .eq('status', 'dispatched')
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data ?? []) as AttentionOrderRow[];
}

async function previewSettlementPending(
  supabase: SupabaseClient,
  limit: number
): Promise<AttentionOrderRow[]> {
  const { data } = await supabase
    .from('orders')
    .select(ORDER_LIST_COLUMNS)
    .in('status', ['failed', 'rejected'])
    .in('settlement_status', [
      SETTLEMENT_STATUS.PENDING_PARTS,
      SETTLEMENT_STATUS.PENDING_APPROVAL,
    ])
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data ?? []) as AttentionOrderRow[];
}

async function previewSlaBreaches(
  supabase: SupabaseClient,
  limit: number
): Promise<AttentionOrderRow[]> {
  const { data, error } = await supabase.rpc('admin_list_sla_breach_orders', {
    p_limit: limit,
    p_offset: 0,
  });
  if (error) {
    console.error('admin_list_sla_breach_orders failed:', error.message);
    return [];
  }
  return (data ?? []) as AttentionOrderRow[];
}

export async function getAdminAttentionInbox(
  supabase: SupabaseClient,
  previewLimit = DASHBOARD_ATTENTION_PREVIEW_LIMIT
): Promise<AdminAttentionInbox> {
  const [
    slaCount,
    sourcingCount,
    escalatedCount,
    priceReviewCount,
    settlementCount,
    slaPreview,
    sourcingPreview,
    escalatedPreview,
    priceReviewPreview,
    settlementPreview,
  ] = await Promise.all([
    countSlaBreaches(supabase),
    countSourcingEscalated(supabase),
    countDeliveryEscalated(supabase),
    countPriceReviewPending(supabase),
    countSettlementPending(supabase),
    previewSlaBreaches(supabase, previewLimit),
    previewSourcingEscalated(supabase, previewLimit),
    previewDeliveryEscalated(supabase, previewLimit),
    previewPriceReview(supabase, previewLimit),
    previewSettlementPending(supabase, previewLimit),
  ]);

  const counts: Record<AttentionType, number> = {
    sla_breach: slaCount,
    sourcing_escalated: sourcingCount,
    delivery_escalated: escalatedCount,
    price_review: priceReviewCount,
    settlement_pending: settlementCount,
  };

  const previews: Record<AttentionType, AttentionOrderRow[]> = {
    sla_breach: slaPreview,
    sourcing_escalated: sourcingPreview,
    delivery_escalated: escalatedPreview,
    price_review: priceReviewPreview,
    settlement_pending: settlementPreview,
  };

  const groups: AttentionGroup[] = ATTENTION_TYPES.filter((type) => counts[type] > 0)
    .sort((a, b) => ATTENTION_PRIORITY[a] - ATTENTION_PRIORITY[b])
    .map((type) => ({
      type,
      count: counts[type],
      preview: previews[type],
      hasMore: counts[type] > previews[type].length,
    }));

  return {
    totalCount: Object.values(counts).reduce((sum, n) => sum + n, 0),
    groups,
  };
}

export async function getAdminOrdersByAttention(
  supabase: SupabaseClient,
  attention: AttentionType,
  page: number,
  limit: number
): Promise<{ orders: AttentionOrderRow[]; total: number }> {
  const offset = (page - 1) * limit;

  if (attention === 'sla_breach') {
    const [listResult, total] = await Promise.all([
      supabase.rpc('admin_list_sla_breach_orders', {
        p_limit: limit,
        p_offset: offset,
      }),
      countSlaBreaches(supabase),
    ]);

    if (listResult.error) throw new Error(listResult.error.message);
    return {
      orders: (listResult.data ?? []) as AttentionOrderRow[],
      total,
    };
  }

  let query = supabase
    .from('orders')
    .select(ORDER_LIST_COLUMNS, { count: 'exact' })
    .order(
      attention === 'sourcing_escalated' ? 'sourcing_escalated_at' : 'created_at',
      { ascending: true }
    )
    .range(offset, offset + limit - 1);

  switch (attention) {
    case 'price_review':
      query = query.eq('price_review_status', 'pending');
      break;
    case 'delivery_escalated':
      query = query
        .eq('delivery_resolution', DELIVERY_RESOLUTION.ADMIN_REVIEW)
        .eq('status', 'dispatched');
      break;
    case 'sourcing_escalated':
      query = query.not('sourcing_escalated_at', 'is', null);
      break;
    case 'settlement_pending':
      query = query
        .in('status', ['failed', 'rejected'])
        .in('settlement_status', [
          SETTLEMENT_STATUS.PENDING_PARTS,
          SETTLEMENT_STATUS.PENDING_APPROVAL,
        ]);
      break;
    default:
      throw new Error(`Unknown attention type: ${String(attention)}`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    orders: (data ?? []) as AttentionOrderRow[],
    total: count ?? 0,
  };
}

export async function enrichAttentionOrdersWithCustomers(
  supabase: SupabaseClient,
  orders: AttentionOrderRow[]
) {
  return attachCustomerNames(supabase, orders);
}
