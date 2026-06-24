export const VENDOR_INCIDENT_TYPES = {
  QUALITY_ISSUE: 'quality_issue',
  PRICE_DISCREPANCY: 'price_discrepancy',
  OUT_OF_STOCK: 'out_of_stock',
  PAYMENT_ISSUE: 'payment_issue',
} as const;

export type VendorIncidentType =
  (typeof VENDOR_INCIDENT_TYPES)[keyof typeof VENDOR_INCIDENT_TYPES];

export const VENDOR_INCIDENT_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
} as const;

export type VendorIncidentStatus =
  (typeof VENDOR_INCIDENT_STATUSES)[keyof typeof VENDOR_INCIDENT_STATUSES];

export const VENDOR_INCIDENT_SOURCES = {
  CUSTOMER: 'customer',
  RIDER: 'rider',
  RUNNER: 'runner',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;

export type VendorIncidentSource =
  (typeof VENDOR_INCIDENT_SOURCES)[keyof typeof VENDOR_INCIDENT_SOURCES];

export const PART_ISSUE_SUBTYPES = [
  'wrong_part',
  'damaged',
  'doesnt_fit',
  'not_ordered',
] as const;

export type PartIssueSubtype = (typeof PART_ISSUE_SUBTYPES)[number];

export const PART_ISSUE_LABELS: Record<PartIssueSubtype, string> = {
  wrong_part: 'Wrong part',
  damaged: 'Damaged / defective',
  doesnt_fit: "Doesn't fit vehicle",
  not_ordered: 'Not what I ordered',
};

export const VENDOR_INCIDENT_TYPE_LABELS: Record<VendorIncidentType, string> = {
  quality_issue: 'Part quality issue',
  price_discrepancy: 'Price over target',
  out_of_stock: 'Out of stock',
  payment_issue: 'Payment issue',
};

export function formatPartIssueSubtype(subtype: string | null | undefined): string {
  if (!subtype) return 'Quality issue';
  return PART_ISSUE_LABELS[subtype as PartIssueSubtype] ?? subtype.replace(/_/g, ' ');
}

export function formatVendorIncidentType(type: string): string {
  return (
    VENDOR_INCIDENT_TYPE_LABELS[type as VendorIncidentType] ?? type.replace(/_/g, ' ')
  );
}
