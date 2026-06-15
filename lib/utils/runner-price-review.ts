export type RunnerPriceReviewPhase =
  | 'none'
  | 'admin_review'
  | 'customer_decision'
  | 'approved'
  | 'cancelled';

interface OrderForRunnerPriceReview {
  status: string;
  price_review_status: string;
  price_topup_amount?: number | null;
  original_total?: number | null;
  revised_total?: number | null;
  order_items?: Array<{
    price_review_status?: string | null;
    description?: string;
    vendor_price?: number | null;
    expected_vendor_price?: number | null;
  }>;
}

export function getRunnerPriceReviewPhase(
  order: OrderForRunnerPriceReview
): RunnerPriceReviewPhase {
  if (
    order.status === 'cancelled' &&
    (order.price_review_status === 'cancelled' ||
      order.order_items?.some((i) => i.price_review_status === 'rejected'))
  ) {
    return 'cancelled';
  }
  if (order.price_review_status === 'pending') return 'admin_review';
  if (order.price_review_status === 'awaiting_customer') return 'customer_decision';
  if (
    order.price_review_status === 'resolved' ||
    order.order_items?.some((i) => i.price_review_status === 'customer_approved')
  ) {
    return 'approved';
  }
  return 'none';
}

export function runnerPriceReviewBlocksHandoff(phase: RunnerPriceReviewPhase): boolean {
  return phase === 'admin_review' || phase === 'customer_decision';
}

export function orderNeedsRunnerPriceReviewPolling(
  order: OrderForRunnerPriceReview
): boolean {
  const phase = getRunnerPriceReviewPhase(order);
  return phase === 'admin_review' || phase === 'customer_decision';
}

/** Runner is waiting on admin or customer — no sourcing action required. */
export function runnerOrderAwaitingExternalResolution(order: {
  price_review_status: string;
}): boolean {
  return (
    order.price_review_status === 'pending' ||
    order.price_review_status === 'awaiting_customer'
  );
}

/** Orders that still need runner action before clocking out. */
export function runnerOrderBlocksShiftEnd(order: {
  assignment_status: string;
  price_review_status: string;
}): boolean {
  if (order.assignment_status === 'assigned') return true;
  if (!['accepted', 'in_progress'].includes(order.assignment_status)) return false;
  return !runnerOrderAwaitingExternalResolution(order);
}

export function countRunnerShiftBlockingOrders(
  orders: Array<{ assignment_status: string; price_review_status: string }>
): number {
  return orders.filter(runnerOrderBlocksShiftEnd).length;
}
