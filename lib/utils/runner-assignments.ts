/** Order statuses where the runner should no longer hold an active assignment. */
export const RUNNER_TERMINAL_ORDER_STATUSES = [
  'cancelled',
  'rejected',
  'failed',
] as const;

/** Order statuses where sourcing is done — assignment should be completed, not active. */
export const RUNNER_POST_SOURCING_ORDER_STATUSES = [
  'picked',
  'dispatched',
  'delivered',
] as const;

export type RunnerAssignmentReleaseAction = 'fail' | 'complete';

/**
 * When an assignment is still active but the order has moved on, decide how to close it.
 * Returns null when the assignment should stay active.
 */
export function runnerAssignmentReleaseAction(
  orderStatus: string,
  priceReviewStatus: string | null | undefined
): RunnerAssignmentReleaseAction | null {
  if (
    RUNNER_TERMINAL_ORDER_STATUSES.includes(
      orderStatus as (typeof RUNNER_TERMINAL_ORDER_STATUSES)[number]
    )
  ) {
    return 'fail';
  }

  if (priceReviewStatus === 'cancelled') {
    return 'fail';
  }

  if (
    RUNNER_POST_SOURCING_ORDER_STATUSES.includes(
      orderStatus as (typeof RUNNER_POST_SOURCING_ORDER_STATUSES)[number]
    )
  ) {
    return 'complete';
  }

  return null;
}
