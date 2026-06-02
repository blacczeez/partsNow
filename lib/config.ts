const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing environment variable: ${key}`);
  }
  return parseInt(value, 10);
};

const getEnvBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value === 'true';
};

export const config = {
  app: {
    name: getEnvVar('NEXT_PUBLIC_APP_NAME', 'PartsNow'),
    url: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    env: getEnvVar('NEXT_PUBLIC_APP_ENV', 'development'),
  },

  business: {
    defaultMarkupPercentage: getEnvNumber('DEFAULT_MARKUP_PERCENTAGE', 15),
    freeDeliveryThreshold: getEnvNumber('FREE_DELIVERY_THRESHOLD', 50000),
    standardDeliveryFee: getEnvNumber('STANDARD_DELIVERY_FEE', 1500),
  },

  delivery: {
    expressRadiusKm: getEnvNumber('EXPRESS_DELIVERY_RADIUS_KM', 10),
    expressPromiseMinutes: getEnvNumber('EXPRESS_DELIVERY_PROMISE_MINUTES', 45),
    standardPromiseMinutes: getEnvNumber('STANDARD_DELIVERY_PROMISE_MINUTES', 120),
  },

  loyalty: {
    verifiedMinOrders: getEnvNumber('TIER_VERIFIED_MIN_ORDERS', 5),
    trustedMinOrders: getEnvNumber('TIER_TRUSTED_MIN_ORDERS', 20),
    trustedDiscountPercentage: getEnvNumber('TIER_TRUSTED_DISCOUNT_PERCENTAGE', 5),
    partnerMinOrders: getEnvNumber('TIER_PARTNER_MIN_ORDERS', 50),
    partnerMinLifetimeSpend: getEnvNumber('TIER_PARTNER_MIN_LIFETIME_SPEND', 500000),
    partnerDiscountPercentage: getEnvNumber('TIER_PARTNER_DISCOUNT_PERCENTAGE', 8),
  },

  credit: {
    enabled: getEnvBoolean('CREDIT_SYSTEM_ENABLED', false),
    starterLimit: getEnvNumber('CREDIT_STARTER_LIMIT', 30000),
    starterRepaymentHours: getEnvNumber('CREDIT_STARTER_REPAYMENT_HOURS', 48),
    standardLimit: getEnvNumber('CREDIT_STANDARD_LIMIT', 75000),
    standardRepaymentHours: getEnvNumber('CREDIT_STANDARD_REPAYMENT_HOURS', 72),
    premiumLimit: getEnvNumber('CREDIT_PREMIUM_LIMIT', 150000),
    premiumRepaymentHours: getEnvNumber('CREDIT_PREMIUM_REPAYMENT_HOURS', 168),
    lateFeePercentage: getEnvNumber('CREDIT_LATE_FEE_PERCENTAGE', 2),
    reminderHoursBeforeDue: getEnvNumber('CREDIT_REMINDER_HOURS_BEFORE_DUE', 24),
    lateFeeAppliedAfterHours: getEnvNumber('CREDIT_LATE_FEE_APPLIED_AFTER_HOURS', 24),
    limitReducedAfterDays: getEnvNumber('CREDIT_LIMIT_REDUCED_AFTER_DAYS', 7),
    accountSuspendedAfterDays: getEnvNumber('CREDIT_ACCOUNT_SUSPENDED_AFTER_DAYS', 14),
    autoDebitEnabled: getEnvBoolean('CREDIT_AUTO_DEBIT_ENABLED', true),
  },

  payments: {
    paystackPublicKey: getEnvVar('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY', 'pk_test_placeholder'),
    paystackSecretKey: getEnvVar('PAYSTACK_SECRET_KEY', 'sk_test_placeholder'),
    codEnabled: getEnvBoolean('COD_ENABLED', true),
    codMaxOrderValue: getEnvNumber('COD_MAX_ORDER_VALUE', 100000),
    codRefusalLimitBeforeDisable: getEnvNumber('COD_REFUSAL_LIMIT_BEFORE_DISABLE', 2),
    paymentHoldExpiryMinutes: getEnvNumber('PAYMENT_HOLD_EXPIRY_MINUTES', 10),
  },

  runner: {
    acceptTimeoutMinutes: getEnvNumber('RUNNER_ACCEPT_TIMEOUT_MINUTES', 5),
    maxConcurrentOrders: getEnvNumber('RUNNER_MAX_CONCURRENT_ORDERS', 3),
    dailyFloatLimit: getEnvNumber('RUNNER_DAILY_FLOAT_LIMIT', 200000),
    minFloatToClockIn: getEnvNumber('RUNNER_MIN_FLOAT_TO_CLOCK_IN', 50000),
    autoReassignEnabled: getEnvBoolean('RUNNER_AUTO_REASSIGN_ENABLED', true),
    commissionPerOrder: getEnvNumber('RUNNER_COMMISSION_PER_ORDER', 600),
  },

  sourcing: {
    timeoutMinutes: getEnvNumber('SOURCING_TIMEOUT_MINUTES', 45),
    slaMinutes: getEnvNumber('SOURCING_SLA_MINUTES', 30),
    requireQcPhoto: getEnvBoolean('REQUIRE_QC_PHOTO', true),
    priceTolerancePercentage: getEnvNumber('VENDOR_PRICE_TOLERANCE_PERCENTAGE', 10),
  },

  dispatch: {
    partner: getEnvVar('DISPATCH_PARTNER', 'kwik'),
    internalEnabled: getEnvBoolean('INTERNAL_DISPATCH_ENABLED', true),
    overflowThresholdMinutes: getEnvNumber('OVERFLOW_TO_PARTNER_THRESHOLD_MINUTES', 15),
    riderWaitTimeMinutes: getEnvNumber('RIDER_WAIT_TIME_MINUTES', 10),
    riderMaxCallAttempts: getEnvNumber('RIDER_MAX_CALL_ATTEMPTS', 2),
    highValueThreshold: getEnvNumber('HIGH_VALUE_ORDER_THRESHOLD', 100000),
    highValueRequiresPhoto: getEnvBoolean('HIGH_VALUE_REQUIRES_PHOTO_CONFIRMATION', true),
    riderMaxConcurrentDeliveries: getEnvNumber('RIDER_MAX_CONCURRENT_DELIVERIES', 3),
  },

  vendor: {
    minReliabilityScore: getEnvNumber('VENDOR_MIN_RELIABILITY_SCORE', 70),
    qualityIssueLimitBeforeRemoval: getEnvNumber('VENDOR_QUALITY_ISSUE_LIMIT_BEFORE_REMOVAL', 3),
  },

  whatsapp: {
    provider: getEnvVar('WHATSAPP_PROVIDER', 'wati'),
    apiUrl: getEnvVar('WATI_API_URL', ''),
    apiKey: getEnvVar('WATI_API_KEY', ''),
    webhookSecret: getEnvVar('WATI_WEBHOOK_SECRET', ''),
  },

  features: {
    carOwnerWebApp: getEnvBoolean('FEATURE_CAR_OWNER_WEB_APP', true),
    mechanicWebApp: getEnvBoolean('FEATURE_MECHANIC_WEB_APP', false),
    creditSystem: getEnvBoolean('FEATURE_CREDIT_SYSTEM', false),
    loyaltyDiscounts: getEnvBoolean('FEATURE_LOYALTY_DISCOUNTS', true),
    voiceNoteTranscription: getEnvBoolean('FEATURE_VOICE_NOTE_TRANSCRIPTION', false),
    maintenanceMode: getEnvBoolean('MAINTENANCE_MODE', false),
  },
} as const;

export type Config = typeof config;
