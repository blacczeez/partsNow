export const ATTENTION_TYPES = [
  'sla_breach',
  'sourcing_escalated',
  'delivery_escalated',
  'price_review',
  'settlement_pending',
] as const;

export type AttentionType = (typeof ATTENTION_TYPES)[number];

/** Lower number = higher priority in cross-type sorting. */
export const ATTENTION_PRIORITY: Record<AttentionType, number> = {
  sla_breach: 0,
  sourcing_escalated: 1,
  delivery_escalated: 2,
  price_review: 3,
  settlement_pending: 4,
};

export const ATTENTION_LABELS: Record<AttentionType, string> = {
  sla_breach: 'SLA breaches',
  sourcing_escalated: 'Sourcing escalations',
  delivery_escalated: 'Delivery escalations',
  price_review: 'Price reviews pending',
  settlement_pending: 'Settlements pending',
};

export const ATTENTION_DESCRIPTIONS: Record<AttentionType, string> = {
  sla_breach: 'Orders past promised delivery time',
  sourcing_escalated: 'Runners could not source parts — needs ops action',
  delivery_escalated: 'Rider escalated — needs ops review',
  price_review: 'Runner price over budget — admin decision needed',
  settlement_pending: 'Failed delivery — settlement or parts return pending',
};

export function getAttentionQueueHref(type: AttentionType): string {
  return `/admin/orders?attention=${type}`;
}

export const DASHBOARD_ATTENTION_PREVIEW_LIMIT = 5;
