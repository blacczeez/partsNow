import type { ParsedAdminDateRange } from '@/lib/utils/admin-date-range';

export interface AdminFinancialTotals {
  serviceFeeTotal: number;
  deliveryRevenueTotal: number;
  commissionTotal: number;
  paidOrderCount: number;
  shiftCount: number;
}

type DateColumn = 'created_at' | 'started_at';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

function applyRangeFilter<T extends { gte: (col: string, val: string) => T; lte: (col: string, val: string) => T }>(
  query: T,
  range: ParsedAdminDateRange,
  column: DateColumn
): T {
  if (range.allTime) return query;
  if (range.from) query = query.gte(column, range.from.toISOString());
  if (range.to) query = query.lte(column, range.to.toISOString());
  return query;
}

export async function getAdminFinancialTotals(
  supabase: SupabaseClient,
  range: ParsedAdminDateRange
): Promise<AdminFinancialTotals> {
  let ordersQuery = supabase
    .from('orders')
    .select('markup_amount, delivery_fee')
    .eq('payment_status', 'paid');

  ordersQuery = applyRangeFilter(ordersQuery, range, 'created_at');

  let shiftsQuery = supabase.from('runner_shifts').select('commission_earned');
  shiftsQuery = applyRangeFilter(shiftsQuery, range, 'started_at');

  const [{ data: orders, error: ordersError }, { data: shifts, error: shiftsError }] =
    await Promise.all([ordersQuery, shiftsQuery]);

  if (ordersError) throw new Error(ordersError.message);
  if (shiftsError) throw new Error(shiftsError.message);

  const paidOrders = orders ?? [];
  const runnerShifts = shifts ?? [];

  return {
    serviceFeeTotal: paidOrders.reduce(
      (sum: number, order: { markup_amount: number }) => sum + (order.markup_amount ?? 0),
      0
    ),
    deliveryRevenueTotal: paidOrders.reduce(
      (sum: number, order: { delivery_fee: number }) => sum + (order.delivery_fee ?? 0),
      0
    ),
    commissionTotal: runnerShifts.reduce(
      (sum: number, shift: { commission_earned: number }) => sum + (shift.commission_earned ?? 0),
      0
    ),
    paidOrderCount: paidOrders.length,
    shiftCount: runnerShifts.length,
  };
}

export const ADMIN_FINANCIAL_DESCRIPTIONS = {
  serviceFee:
    'Sum of markup_amount on paid orders in this period. This is the platform service fee on vendor parts cost (typically ~15%).',
  deliveryRevenue:
    'Sum of delivery_fee on paid orders in this period. Free-delivery orders contribute ₦0.',
  commission:
    'Sum of commission_earned on runner shifts that started in this period. Paid to runners for sourcing and handoff.',
} as const;
