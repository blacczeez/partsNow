import { RIDER_PRE_DELIVERY_STATUSES } from '@/lib/constants/order-status';
import type { OrderStatus } from '@/lib/types/database';

/** Order statuses where the rider should no longer hold an active assignment. */
export const RIDER_TERMINAL_ORDER_STATUSES = [
  'cancelled',
  'rejected',
  'failed',
] as const;

export type RiderAssignmentReleaseAction = 'fail' | 'complete';

/**
 * When a rider assignment is still active but the order has moved on, decide how to close it.
 * Returns null when the assignment should stay active (e.g. picked, awaiting pickup).
 */
export function riderAssignmentReleaseAction(
  orderStatus: string,
  priceReviewStatus: string | null | undefined
): RiderAssignmentReleaseAction | null {
  if (
    RIDER_TERMINAL_ORDER_STATUSES.includes(
      orderStatus as (typeof RIDER_TERMINAL_ORDER_STATUSES)[number]
    )
  ) {
    return 'fail';
  }

  if (priceReviewStatus === 'cancelled') {
    return 'fail';
  }

  if (RIDER_PRE_DELIVERY_STATUSES.includes(orderStatus as OrderStatus)) {
    return 'fail';
  }

  if (orderStatus === 'delivered') {
    return 'complete';
  }

  return null;
}
