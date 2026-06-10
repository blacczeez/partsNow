import { formatDeliveryFailureReason } from '@/lib/constants/delivery-failure';

/** Stable keys stored in audit_log.action — use these when writing rows. */
export const AUDIT_ACTIONS = {
  ORDER_DELIVERY_CLOSED: 'order.delivery_closed',
  ORDER_DELIVERY_ESCALATED: 'order.delivery_escalated',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/** Legacy action strings still present in older rows. */
const LEGACY_ACTION_ALIASES: Record<string, AuditAction> = {
  delivery_failure_terminal: AUDIT_ACTIONS.ORDER_DELIVERY_CLOSED,
  delivery_failure_admin_review: AUDIT_ACTIONS.ORDER_DELIVERY_ESCALATED,
};

const ACTION_LABELS: Record<AuditAction, string> = {
  [AUDIT_ACTIONS.ORDER_DELIVERY_CLOSED]: 'Delivery closed',
  [AUDIT_ACTIONS.ORDER_DELIVERY_ESCALATED]: 'Delivery escalated to admin',
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

export const AUDIT_ACTION_FILTER_OPTIONS: Array<{ value: AuditAction; label: string }> = [
  {
    value: AUDIT_ACTIONS.ORDER_DELIVERY_CLOSED,
    label: ACTION_LABELS[AUDIT_ACTIONS.ORDER_DELIVERY_CLOSED],
  },
  {
    value: AUDIT_ACTIONS.ORDER_DELIVERY_ESCALATED,
    label: ACTION_LABELS[AUDIT_ACTIONS.ORDER_DELIVERY_ESCALATED],
  },
];

const ENTITY_TYPE_LABELS: Record<string, string> = {
  order: 'Order',
  user: 'User',
  delivery: 'Delivery',
  cluster: 'Market',
  vendor: 'Vendor',
  part: 'Part',
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
  if (entityType === 'order') {
    const parts: string[] = [];
    if (context?.orderStatus) {
      parts.push(
        ORDER_STATUS_LABELS[context.orderStatus] ??
          context.orderStatus.replace(/_/g, ' ')
      );
    }
    return parts.length > 0 ? parts.join(' · ') : null;
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
  return null;
}

export const AUDIT_ENTITY_FILTER_OPTIONS = [
  { value: 'order', label: 'Orders' },
  { value: 'user', label: 'Users' },
  { value: 'delivery', label: 'Deliveries' },
] as const;
