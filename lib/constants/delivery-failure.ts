export const DELIVERY_FAILURE_REASONS = [
  'customer_unavailable',
  'customer_refused',
  'wrong_address',
  'other',
] as const;

export type DeliveryFailureReason = (typeof DELIVERY_FAILURE_REASONS)[number];

export const DELIVERY_FAILURE_LABELS: Record<DeliveryFailureReason, string> = {
  customer_unavailable: 'Customer unavailable',
  customer_refused: 'Customer refused delivery',
  wrong_address: 'Wrong address',
  other: 'Other issue',
};

export const DELIVERY_RESOLUTION = {
  RETRY: 'retry',
  ADMIN_REVIEW: 'admin_review',
  RETURN_PENDING: 'return_pending',
} as const;

export const PARTS_CUSTODY = {
  WITH_RIDER: 'with_rider',
  AT_HUB: 'at_hub',
} as const;

/** Admin can confirm hub return when custody is with rider, or unset on terminal orders. */
export function canConfirmPartsAtHub(
  partsCustody: string | null,
  orderStatus: string
): boolean {
  if (partsCustody === PARTS_CUSTODY.AT_HUB) return false;
  if (partsCustody === PARTS_CUSTODY.WITH_RIDER) return true;
  return (
    partsCustody == null && ['failed', 'rejected'].includes(orderStatus)
  );
}

export function formatDeliveryFailureReason(reason: string): string {
  return (
    DELIVERY_FAILURE_LABELS[reason as DeliveryFailureReason] ??
    reason.replace(/_/g, ' ')
  );
}

export function requiresFailurePhoto(
  reason: DeliveryFailureReason,
  isHighValue: boolean,
  highValueRequiresPhoto: boolean
): boolean {
  if (reason === 'customer_refused') return true;
  if (isHighValue && highValueRequiresPhoto) return true;
  return false;
}
