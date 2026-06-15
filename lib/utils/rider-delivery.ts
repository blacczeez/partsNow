import { runnerOrderAwaitingExternalResolution } from '@/lib/utils/runner-price-review';

/** Rider is en route or at customer — must finish or report failure before logging out. */
export function riderDeliveryBlocksLogout(order: {
  assignment_status: string;
  price_review_status: string;
}): boolean {
  if (order.assignment_status === 'in_progress') return true;
  if (order.assignment_status === 'assigned') {
    return !runnerOrderAwaitingExternalResolution(order);
  }
  return false;
}

export function countRiderLogoutBlockingDeliveries(
  deliveries: Array<{ assignment_status: string; price_review_status: string }> = []
): number {
  return deliveries.filter(riderDeliveryBlocksLogout).length;
}

/** Assigned pickup waiting on admin/customer — rider can release without blocking logout. */
export function riderDeliveryAwaitingExternalResolution(order: {
  assignment_status: string;
  price_review_status: string;
}): boolean {
  return (
    order.assignment_status === 'assigned' &&
    runnerOrderAwaitingExternalResolution(order)
  );
}
