export type AdminSettingType = 'number' | 'boolean' | 'string';

export interface AdminSettingField {
  key: string;
  label: string;
  type: AdminSettingType;
  description: string;
  envKey?: string;
}

export interface AdminSettingsGroup {
  id: string;
  label: string;
  description: string;
  keys: AdminSettingField[];
}

export const ADMIN_SETTINGS_GROUPS: AdminSettingsGroup[] = [
  {
    id: 'business',
    label: 'Business Model',
    description:
      'Core pricing rules applied at checkout. Values saved here override environment defaults.',
    keys: [
      {
        key: 'default_markup_percentage',
        label: 'Default Markup %',
        type: 'number',
        envKey: 'DEFAULT_MARKUP_PERCENTAGE',
        description:
          'Platform markup on catalog/vendor prices before loyalty discounts. Trusted and Partner tiers can reduce this further.',
      },
      {
        key: 'free_delivery_threshold',
        label: 'Free Delivery Threshold (NGN)',
        type: 'number',
        envKey: 'FREE_DELIVERY_THRESHOLD',
        description:
          'Parts subtotal at or above which free delivery may apply. Weight-tier eligibility is configured under Delivery tiers.',
      },
      {
        key: 'standard_delivery_fee',
        label: 'Standard Delivery Fee (NGN)',
        type: 'number',
        envKey: 'STANDARD_DELIVERY_FEE',
        description:
          'Fallback flat delivery fee when an order has no part weights. Weight-based tiers take precedence when weights are known.',
      },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery',
    description:
      'Express zone and customer ETA promises. Weight-based fees and vehicle routing are managed under Delivery tiers.',
    keys: [
      {
        key: 'express_delivery_radius_km',
        label: 'Express Delivery Radius (km)',
        type: 'number',
        envKey: 'EXPRESS_DELIVERY_RADIUS_KM',
        description:
          'Maximum distance from the market cluster for express delivery eligibility.',
      },
      {
        key: 'express_delivery_promise_minutes',
        label: 'Express Promise (minutes)',
        type: 'number',
        envKey: 'EXPRESS_DELIVERY_PROMISE_MINUTES',
        description:
          'Default promised delivery time shown to customers for express orders when a tier does not specify its own promise.',
      },
      {
        key: 'standard_delivery_promise_minutes',
        label: 'Standard Promise (minutes)',
        type: 'number',
        envKey: 'STANDARD_DELIVERY_PROMISE_MINUTES',
        description:
          'Promised delivery time for standard or heavy tiers that do not allow express.',
      },
    ],
  },
  {
    id: 'runner',
    label: 'Runner Settings',
    description:
      'Operational limits for market runners: assignment capacity, float caps, and pay per completed order.',
    keys: [
      {
        key: 'runner_accept_timeout_minutes',
        label: 'Accept Timeout (minutes)',
        type: 'number',
        envKey: 'RUNNER_ACCEPT_TIMEOUT_MINUTES',
        description:
          'How long a runner has to accept a new assignment before the system can auto-reassign.',
      },
      {
        key: 'runner_max_concurrent_orders',
        label: 'Max Concurrent Orders',
        type: 'number',
        envKey: 'RUNNER_MAX_CONCURRENT_ORDERS',
        description:
          'Maximum active sourcing assignments per runner at one time.',
      },
      {
        key: 'runner_daily_float_limit',
        label: 'Daily Float Limit (NGN)',
        type: 'number',
        envKey: 'RUNNER_DAILY_FLOAT_LIMIT',
        description:
          'Maximum runner float that can be topped up or held per day.',
      },
      {
        key: 'runner_commission_per_order',
        label: 'Commission Per Order (NGN)',
        type: 'number',
        envKey: 'RUNNER_COMMISSION_PER_ORDER',
        description:
          'Amount credited to a runner’s shift commission when an order is handed to a rider.',
      },
    ],
  },
  {
    id: 'loyalty',
    label: 'Loyalty Tiers',
    description:
      'Thresholds for tier upgrades and markup discounts. Tier upgrades also run in the database when orders are delivered.',
    keys: [
      {
        key: 'loyalty_verified_min_orders',
        label: 'Verified — min delivered orders',
        type: 'number',
        envKey: 'TIER_VERIFIED_MIN_ORDERS',
        description: 'Paid, delivered orders required to reach Verified tier.',
      },
      {
        key: 'loyalty_trusted_min_orders',
        label: 'Trusted — min delivered orders',
        type: 'number',
        envKey: 'TIER_TRUSTED_MIN_ORDERS',
        description: 'Paid, delivered orders required to reach Trusted tier.',
      },
      {
        key: 'loyalty_partner_min_orders',
        label: 'Partner — min delivered orders',
        type: 'number',
        envKey: 'TIER_PARTNER_MIN_ORDERS',
        description: 'Paid, delivered orders required for Partner tier (plus spend rule).',
      },
      {
        key: 'loyalty_partner_min_lifetime_spend',
        label: 'Partner — min lifetime spend (NGN)',
        type: 'number',
        envKey: 'TIER_PARTNER_MIN_LIFETIME_SPEND',
        description: 'Minimum lifetime spend required for Partner tier.',
      },
      {
        key: 'loyalty_trusted_discount_percentage',
        label: 'Trusted — markup discount (percentage points)',
        type: 'number',
        envKey: 'TIER_TRUSTED_DISCOUNT_PERCENTAGE',
        description:
          'Points subtracted from default markup for Trusted customers (e.g. 5 → 15% becomes 10%).',
      },
      {
        key: 'loyalty_partner_discount_percentage',
        label: 'Partner — markup discount (percentage points)',
        type: 'number',
        envKey: 'TIER_PARTNER_DISCOUNT_PERCENTAGE',
        description:
          'Points subtracted from default markup for Partner customers (e.g. 8 → 15% becomes 7%).',
      },
    ],
  },
  {
    id: 'features',
    label: 'Features',
    description:
      'Product feature flags. When disabled here, the related experience is turned off without redeploying.',
    keys: [
      {
        key: 'feature_car_owner_web_app',
        label: 'Car Owner Web App',
        type: 'boolean',
        envKey: 'FEATURE_CAR_OWNER_WEB_APP',
        description: 'Allow car owners to use the customer web app.',
      },
      {
        key: 'feature_mechanic_web_app',
        label: 'Mechanic Web App',
        type: 'boolean',
        envKey: 'FEATURE_MECHANIC_WEB_APP',
        description: 'Enable mechanic web access (WhatsApp remains the primary mechanic channel).',
      },
      {
        key: 'feature_credit_system',
        label: 'Credit System',
        type: 'boolean',
        envKey: 'FEATURE_CREDIT_SYSTEM',
        description: 'Enable buy-now-pay-later credit for eligible mechanics.',
      },
      {
        key: 'feature_loyalty_discounts',
        label: 'Loyalty Discounts',
        type: 'boolean',
        envKey: 'FEATURE_LOYALTY_DISCOUNTS',
        description:
          'Apply Trusted/Partner markup reductions at checkout. Tier thresholds still apply when off.',
      },
      {
        key: 'maintenance_mode',
        label: 'Maintenance Mode',
        type: 'boolean',
        envKey: 'MAINTENANCE_MODE',
        description:
          'Show a maintenance message and block non-admin app usage until turned off.',
      },
    ],
  },
];

export const ADMIN_RUNTIME_CONFIG_KEYS = ADMIN_SETTINGS_GROUPS.flatMap((group) =>
  group.keys.map((field) => field.key)
);

export const DELIVERY_TIERS_CARD = {
  title: 'Weight-based delivery',
  description:
    'Configure Lagos delivery tiers, per-tier fees, vehicle routing, express eligibility, and which tiers qualify for free delivery. This drives checkout pricing and order snapshots.',
};

export const DELIVERY_SETTINGS_COPY = {
  intro:
    'Saved values here are the source of truth for weight-based delivery. They override environment defaults for free-delivery rules and tier tables.',
  freeDelivery: {
    threshold:
      'Parts subtotal at or above this amount can qualify for free delivery, but only on tiers you mark as eligible below.',
    eligibleTiers:
      'Free delivery applies only when the cart’s resolved weight tier is one of these. Heavy tiers can be excluded even above the threshold.',
  },
  tierFields: {
    id: 'Stable slug stored on orders (e.g. light, medium). Changing IDs affects new orders only.',
    label: 'Customer-facing name shown in checkout summaries.',
    minKg: 'Minimum total cart weight (kg) for this tier, inclusive.',
    maxKg: 'Maximum weight for this tier. Leave empty for no upper limit.',
    deliveryFee: 'Flat delivery fee (NGN) when this tier applies.',
    promiseMinutes: 'ETA promise shown to customers for orders in this tier.',
    vehicleType: 'How we route dispatch: bike, car, van, or partner overflow.',
    sortOrder: 'Evaluation order when multiple tiers could match (lower first).',
    expressAllowed: 'Whether express delivery is offered for this weight band.',
    active: 'Inactive tiers are ignored when resolving checkout pricing.',
  },
};
