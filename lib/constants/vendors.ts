export const VENDOR_VERIFICATION_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
} as const;

export type VendorVerificationStatus =
  (typeof VENDOR_VERIFICATION_STATUS)[keyof typeof VENDOR_VERIFICATION_STATUS];
