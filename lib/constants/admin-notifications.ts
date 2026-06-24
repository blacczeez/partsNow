import {
  ATTENTION_DESCRIPTIONS,
  ATTENTION_LABELS,
  ATTENTION_TYPES,
  getAttentionQueueHref,
  type AttentionType,
} from '@/lib/constants/admin-attention';

export const VENDOR_NOTIFICATION_TYPES = [
  'vendor_incident_pending',
  'vendor_pending_activation',
] as const;

export type VendorNotificationType = (typeof VENDOR_NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPES = [
  ...ATTENTION_TYPES,
  ...VENDOR_NOTIFICATION_TYPES,
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Lower number = higher priority in the inbox panel. */
export const NOTIFICATION_PRIORITY: Record<NotificationType, number> = {
  sla_breach: 0,
  sourcing_escalated: 1,
  delivery_escalated: 2,
  vendor_incident_pending: 3,
  price_review: 4,
  vendor_pending_activation: 5,
  settlement_pending: 6,
};

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  ...ATTENTION_LABELS,
  vendor_incident_pending: 'Part quality reports',
  vendor_pending_activation: 'Vendors pending activation',
};

export const NOTIFICATION_DESCRIPTIONS: Record<NotificationType, string> = {
  ...ATTENTION_DESCRIPTIONS,
  vendor_incident_pending: 'Customer or rider reports awaiting review',
  vendor_pending_activation: 'Runner quick-adds need contact details',
};

export const NOTIFICATION_VARIANTS: Record<
  NotificationType,
  'error' | 'warning' | 'info'
> = {
  sla_breach: 'error',
  sourcing_escalated: 'warning',
  delivery_escalated: 'warning',
  vendor_incident_pending: 'warning',
  price_review: 'warning',
  vendor_pending_activation: 'info',
  settlement_pending: 'info',
};

export function getNotificationQueueHref(type: NotificationType): string {
  if (type === 'vendor_incident_pending') {
    return '/admin/vendors';
  }
  if (type === 'vendor_pending_activation') {
    return '/admin/vendors?filter=pending';
  }
  return getAttentionQueueHref(type as AttentionType);
}

export const NOTIFICATION_PREVIEW_LIMIT = 4;
