import { formatDeliveryFailureReason } from '@/lib/constants/delivery-failure';

/** Stable keys stored in audit_log.action */
export const AUDIT_ACTIONS = {
  ORDER_CREATED: 'order.created',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_CANCELLED_ADMIN: 'order.cancelled_admin',
  ORDER_PICKED: 'order.picked',
  ORDER_DISPATCHED: 'order.dispatched',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_DELIVERY_RETRY: 'order.delivery_retry',
  ORDER_DELIVERY_CLOSED: 'order.delivery_closed',
  ORDER_DELIVERY_ESCALATED: 'order.delivery_escalated',
  ORDER_DELIVERY_ESCALATION_CLEARED: 'order.delivery_escalation_cleared',
  ORDER_PARTS_RETURNED_HUB: 'order.parts_returned_hub',
  ORDER_SETTLEMENT_INITIATED: 'order.settlement_initiated',
  ORDER_SETTLEMENT_UPDATED: 'order.settlement_updated',
  ORDER_SETTLEMENT_EXECUTED: 'order.settlement_executed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_REFUNDED_PARTIAL: 'payment.refunded_partial',
  PRICE_REVIEW_ESCALATED: 'price_review.escalated',
  PRICE_REVIEW_APPROVED: 'price_review.approved',
  PRICE_REVIEW_REJECTED: 'price_review.rejected',
  ASSIGNMENT_REASSIGNED: 'assignment.reassigned',
  ASSIGNMENT_RUNNER_ASSIGNED: 'assignment.runner_assigned',
  ASSIGNMENT_RIDER_ASSIGNED: 'assignment.rider_assigned',
  RUNNER_FLOAT_TOPPED_UP: 'runner.float_topped_up',
  RUNNER_SHIFT_STARTED: 'runner.shift_started',
  RUNNER_SHIFT_ENDED: 'runner.shift_ended',
  RUNNER_SHIFT_RECONCILED: 'runner.shift_reconciled',
  RUNNER_ORDER_ACCEPTED: 'runner.order_accepted',
  RUNNER_ORDER_REJECTED: 'runner.order_rejected',
  RUNNER_ORDER_COMPLETED: 'runner.order_completed',
  RUNNER_ITEM_UNAVAILABLE: 'runner.item_unavailable',
  RUNNER_SLA_BREACHED: 'runner.sla_breached',
  SOURCING_ESCALATION_RETRY_ASSIGN: 'sourcing.escalation_retry_assign',
  SOURCING_ESCALATION_CUSTOMER_MESSAGE: 'sourcing.escalation_customer_message',
  SOURCING_ESCALATION_DISMISSED: 'sourcing.escalation_dismissed',
  RIDER_PICKUP_CONFIRMED: 'rider.pickup_confirmed',
  RIDER_DELIVERY_COMPLETED: 'rider.delivery_completed',
  RIDER_DELIVERY_DECLINED: 'rider.delivery_declined',
  USER_COD_DISABLED: 'user.cod_disabled',
  ADMIN_CUSTOMER_LOYALTY_UPDATED: 'admin.customer_loyalty_updated',
  VENDOR_CREATED: 'vendor.created',
  VENDOR_UPDATED: 'vendor.updated',
  VENDOR_QUICK_ADDED_BY_RUNNER: 'vendor.quick_added_by_runner',
  VENDOR_ACTIVATED: 'vendor.activated',
  VENDOR_MERGED: 'vendor.merged',
  PART_CREATED: 'part.created',
  PART_UPDATED: 'part.updated',
  PART_CATEGORY_CREATED: 'part_category.created',
  PART_CATEGORY_UPDATED: 'part_category.updated',
  VENDOR_PART_LINKED: 'vendor_part.linked',
  VENDOR_PART_PRICE_UPDATED: 'vendor_part.price_updated',
  CLUSTER_CREATED: 'cluster.created',
  CLUSTER_UPDATED: 'cluster.updated',
  SYSTEM_CONFIG_UPDATED: 'system_config.updated',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

const LEGACY_ACTION_ALIASES: Record<string, AuditAction> = {
  delivery_failure_terminal: AUDIT_ACTIONS.ORDER_DELIVERY_CLOSED,
  delivery_failure_admin_review: AUDIT_ACTIONS.ORDER_DELIVERY_ESCALATED,
};

export const ACTION_LABELS: Record<AuditAction, string> = {
  [AUDIT_ACTIONS.ORDER_CREATED]: 'Order placed',
  [AUDIT_ACTIONS.ORDER_CANCELLED]: 'Order cancelled by customer',
  [AUDIT_ACTIONS.ORDER_CANCELLED_ADMIN]: 'Order cancelled by admin',
  [AUDIT_ACTIONS.ORDER_PICKED]: 'Order picked (runner handoff)',
  [AUDIT_ACTIONS.ORDER_DISPATCHED]: 'Order dispatched',
  [AUDIT_ACTIONS.ORDER_DELIVERED]: 'Order delivered',
  [AUDIT_ACTIONS.ORDER_DELIVERY_RETRY]: 'Delivery retry scheduled',
  [AUDIT_ACTIONS.ORDER_DELIVERY_CLOSED]: 'Delivery closed',
  [AUDIT_ACTIONS.ORDER_DELIVERY_ESCALATED]: 'Delivery escalated to admin',
  [AUDIT_ACTIONS.ORDER_DELIVERY_ESCALATION_CLEARED]: 'Delivery escalation cleared',
  [AUDIT_ACTIONS.ORDER_PARTS_RETURNED_HUB]: 'Parts returned to hub',
  [AUDIT_ACTIONS.ORDER_SETTLEMENT_INITIATED]: 'Settlement initiated',
  [AUDIT_ACTIONS.ORDER_SETTLEMENT_UPDATED]: 'Settlement updated',
  [AUDIT_ACTIONS.ORDER_SETTLEMENT_EXECUTED]: 'Settlement executed',
  [AUDIT_ACTIONS.PAYMENT_REFUNDED]: 'Full refund issued',
  [AUDIT_ACTIONS.PAYMENT_REFUNDED_PARTIAL]: 'Partial refund issued',
  [AUDIT_ACTIONS.PRICE_REVIEW_ESCALATED]: 'Price review escalated',
  [AUDIT_ACTIONS.PRICE_REVIEW_APPROVED]: 'Price change approved',
  [AUDIT_ACTIONS.PRICE_REVIEW_REJECTED]: 'Price review item rejected',
  [AUDIT_ACTIONS.ASSIGNMENT_REASSIGNED]: 'Assignment reassigned',
  [AUDIT_ACTIONS.ASSIGNMENT_RUNNER_ASSIGNED]: 'Runner assigned',
  [AUDIT_ACTIONS.ASSIGNMENT_RIDER_ASSIGNED]: 'Rider assigned',
  [AUDIT_ACTIONS.RUNNER_FLOAT_TOPPED_UP]: 'Runner float topped up',
  [AUDIT_ACTIONS.RUNNER_SHIFT_STARTED]: 'Runner shift started',
  [AUDIT_ACTIONS.RUNNER_SHIFT_ENDED]: 'Runner shift ended',
  [AUDIT_ACTIONS.RUNNER_SHIFT_RECONCILED]: 'Runner shift reconciled',
  [AUDIT_ACTIONS.RUNNER_ORDER_ACCEPTED]: 'Runner accepted order',
  [AUDIT_ACTIONS.RUNNER_ORDER_REJECTED]: 'Runner rejected order',
  [AUDIT_ACTIONS.RUNNER_ORDER_COMPLETED]: 'Runner completed sourcing',
  [AUDIT_ACTIONS.RUNNER_ITEM_UNAVAILABLE]: 'Runner marked item unavailable',
  [AUDIT_ACTIONS.RUNNER_SLA_BREACHED]: 'Runner sourcing SLA breached',
  [AUDIT_ACTIONS.SOURCING_ESCALATION_RETRY_ASSIGN]: 'Admin retried runner assignment',
  [AUDIT_ACTIONS.SOURCING_ESCALATION_CUSTOMER_MESSAGE]: 'Admin messaged customer (sourcing)',
  [AUDIT_ACTIONS.SOURCING_ESCALATION_DISMISSED]: 'Sourcing escalation dismissed',
  [AUDIT_ACTIONS.RIDER_PICKUP_CONFIRMED]: 'Rider confirmed pickup',
  [AUDIT_ACTIONS.RIDER_DELIVERY_COMPLETED]: 'Rider completed delivery',
  [AUDIT_ACTIONS.RIDER_DELIVERY_DECLINED]: 'Rider declined or transferred delivery',
  [AUDIT_ACTIONS.USER_COD_DISABLED]: 'COD disabled on customer',
  [AUDIT_ACTIONS.VENDOR_CREATED]: 'Vendor created',
  [AUDIT_ACTIONS.VENDOR_UPDATED]: 'Vendor updated',
  [AUDIT_ACTIONS.VENDOR_QUICK_ADDED_BY_RUNNER]: 'Runner quick-added vendor',
  [AUDIT_ACTIONS.VENDOR_ACTIVATED]: 'Vendor activated by admin',
  [AUDIT_ACTIONS.VENDOR_MERGED]: 'Duplicate vendors merged',
  [AUDIT_ACTIONS.PART_CREATED]: 'Part created',
  [AUDIT_ACTIONS.PART_UPDATED]: 'Part updated',
  [AUDIT_ACTIONS.PART_CATEGORY_CREATED]: 'Part category created',
  [AUDIT_ACTIONS.PART_CATEGORY_UPDATED]: 'Part category updated',
  [AUDIT_ACTIONS.VENDOR_PART_LINKED]: 'Vendor linked to part',
  [AUDIT_ACTIONS.VENDOR_PART_PRICE_UPDATED]: 'Vendor part price updated',
  [AUDIT_ACTIONS.CLUSTER_CREATED]: 'Market created',
  [AUDIT_ACTIONS.CLUSTER_UPDATED]: 'Market updated',
  [AUDIT_ACTIONS.SYSTEM_CONFIG_UPDATED]: 'System config updated',
  [AUDIT_ACTIONS.ADMIN_CUSTOMER_LOYALTY_UPDATED]: 'Customer loyalty tier updated',
};

export function normalizeAuditAction(action: string): AuditAction | null {
  if (action in ACTION_LABELS) {
    return action as AuditAction;
  }
  return LEGACY_ACTION_ALIASES[action] ?? null;
}

export function formatAuditActionLabel(action: string): string {
  const normalized = normalizeAuditAction(action);
  if (normalized) {
    return ACTION_LABELS[normalized];
  }
  return action.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAuditActionDetail(
  action: string,
  newValues?: Record<string, unknown> | null
): string | null {
  if (!newValues) return null;

  const normalized = normalizeAuditAction(action);

  if (normalized === AUDIT_ACTIONS.ORDER_DELIVERY_CLOSED) {
    const reason =
      typeof newValues.reason === 'string'
        ? formatDeliveryFailureReason(newValues.reason)
        : null;
    const status =
      newValues.terminalStatus === 'rejected'
        ? 'Rejected by customer'
        : newValues.terminalStatus === 'failed'
          ? 'Marked failed'
          : null;
    const parts = [reason, status].filter(Boolean);
    if (typeof newValues.notes === 'string' && newValues.notes.trim()) {
      parts.push(newValues.notes.trim());
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  if (normalized === AUDIT_ACTIONS.ORDER_DELIVERY_ESCALATED) {
    const reason =
      typeof newValues.reason === 'string'
        ? formatDeliveryFailureReason(newValues.reason)
        : null;
    const parts = [reason ? `Needs review: ${reason}` : 'Awaiting ops review'];
    if (typeof newValues.notes === 'string' && newValues.notes.trim()) {
      parts.push(newValues.notes.trim());
    }
    return parts.join(' · ');
  }

  const summary =
    typeof newValues.summary === 'string' ? newValues.summary.trim() : null;
  return summary || null;
}

export const AUDIT_ACTION_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'order.', label: 'All order events' },
  { value: 'payment.', label: 'Payments & refunds' },
  { value: 'price_review.', label: 'Price reviews' },
  { value: 'assignment.', label: 'Assignments' },
  { value: 'runner.', label: 'Runner actions' },
  { value: 'rider.', label: 'Rider actions' },
  { value: AUDIT_ACTIONS.VENDOR_CREATED, label: ACTION_LABELS[AUDIT_ACTIONS.VENDOR_CREATED] },
  { value: AUDIT_ACTIONS.VENDOR_UPDATED, label: ACTION_LABELS[AUDIT_ACTIONS.VENDOR_UPDATED] },
  { value: AUDIT_ACTIONS.VENDOR_MERGED, label: ACTION_LABELS[AUDIT_ACTIONS.VENDOR_MERGED] },
  { value: AUDIT_ACTIONS.PART_CREATED, label: ACTION_LABELS[AUDIT_ACTIONS.PART_CREATED] },
  { value: AUDIT_ACTIONS.PART_UPDATED, label: ACTION_LABELS[AUDIT_ACTIONS.PART_UPDATED] },
  { value: AUDIT_ACTIONS.CLUSTER_CREATED, label: ACTION_LABELS[AUDIT_ACTIONS.CLUSTER_CREATED] },
  { value: AUDIT_ACTIONS.CLUSTER_UPDATED, label: ACTION_LABELS[AUDIT_ACTIONS.CLUSTER_UPDATED] },
  { value: AUDIT_ACTIONS.SYSTEM_CONFIG_UPDATED, label: ACTION_LABELS[AUDIT_ACTIONS.SYSTEM_CONFIG_UPDATED] },
];

const ENTITY_TYPE_LABELS: Record<string, string> = {
  order: 'Order',
  user: 'User',
  vendor: 'Vendor',
  part: 'Part',
  cluster: 'Market',
  vendor_part: 'Vendor part',
  system_config: 'Config',
  order_assignment: 'Assignment',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  sourcing: 'Sourcing',
  picked: 'Picked',
  dispatched: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  failed: 'Failed',
};

export interface AuditEntityContext {
  orderNumber?: string;
  orderStatus?: string;
  userName?: string;
  userPhone?: string;
  vendorName?: string;
  partName?: string;
  clusterName?: string;
  configKey?: string;
}

export function formatAuditEntityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType.replace(/_/g, ' ');
}

export function formatAuditEntityLabel(
  entityType: string,
  entityId: string | null,
  context?: AuditEntityContext
): string {
  if (entityType === 'order' && context?.orderNumber) {
    return `Order ${context.orderNumber}`;
  }
  if (entityType === 'user' && context?.userName) {
    return context.userName;
  }
  if (entityType === 'vendor' && context?.vendorName) {
    return context.vendorName;
  }
  if (entityType === 'part' && context?.partName) {
    return context.partName;
  }
  if (entityType === 'cluster' && context?.clusterName) {
    return context.clusterName;
  }
  if (entityType === 'system_config' && context?.configKey) {
    return `Config: ${context.configKey}`;
  }
  const typeLabel = formatAuditEntityTypeLabel(entityType);
  if (entityId) {
    return `${typeLabel} (${entityId.slice(0, 8)}…)`;
  }
  return typeLabel;
}

export function formatAuditEntityDetail(
  entityType: string,
  context?: AuditEntityContext
): string | null {
  if (entityType === 'order' && context?.orderStatus) {
    return (
      ORDER_STATUS_LABELS[context.orderStatus] ??
      context.orderStatus.replace(/_/g, ' ')
    );
  }
  if (entityType === 'user' && context?.userPhone) {
    return context.userPhone;
  }
  return null;
}

export function getAuditEntityHref(
  entityType: string,
  context?: AuditEntityContext
): string | null {
  if (entityType === 'order' && context?.orderNumber) {
    return `/admin/orders?search=${encodeURIComponent(context.orderNumber)}`;
  }
  if (entityType === 'vendor' && context?.vendorName) {
    return `/admin/vendors?search=${encodeURIComponent(context.vendorName)}`;
  }
  if (entityType === 'part' && context?.partName) {
    return `/admin/parts?search=${encodeURIComponent(context.partName)}`;
  }
  return null;
}

export const AUDIT_ENTITY_FILTER_OPTIONS = [
  { value: 'order', label: 'Orders' },
  { value: 'user', label: 'Users' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'part', label: 'Parts' },
  { value: 'cluster', label: 'Markets' },
  { value: 'system_config', label: 'Config' },
] as const;

/** Legacy + prefix filters for getAuditLog */
export const AUDIT_ACTION_LEGACY_ALIASES: Record<string, string[]> = {
  [AUDIT_ACTIONS.ORDER_DELIVERY_CLOSED]: ['delivery_failure_terminal'],
  [AUDIT_ACTIONS.ORDER_DELIVERY_ESCALATED]: ['delivery_failure_admin_review'],
};

export function isAuditActionPrefixFilter(action: string): boolean {
  return action.endsWith('.');
}
