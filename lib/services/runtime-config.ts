import { cache } from 'react';
import { config } from '@/lib/config';
import {
  ADMIN_RUNTIME_CONFIG_KEYS,
  ADMIN_SETTINGS_GROUPS,
} from '@/lib/constants/admin-settings';
import {
  DEFAULT_DELIVERY_WEIGHT_TIERS,
  DEFAULT_FREE_DELIVERY_ELIGIBLE_TIERS,
  getDefaultDeliveryPricingConfig,
} from '@/lib/constants/delivery-tiers';
import { createServiceClient } from '@/lib/supabase/service';
import type { DeliveryPricingConfig, DeliveryWeightTier } from '@/lib/types/delivery';
import type { LoyaltyThresholds } from '@/lib/types/loyalty-thresholds';

function defaultLoyaltyThresholds(): LoyaltyThresholds {
  return {
    verifiedMinOrders: config.loyalty.verifiedMinOrders,
    trustedMinOrders: config.loyalty.trustedMinOrders,
    partnerMinOrders: config.loyalty.partnerMinOrders,
    partnerMinLifetimeSpend: config.loyalty.partnerMinLifetimeSpend,
    trustedDiscountPercentage: config.loyalty.trustedDiscountPercentage,
    partnerDiscountPercentage: config.loyalty.partnerDiscountPercentage,
  };
}

export type ConfigValueSource = 'database' | 'env';

export interface RuntimeConfig {
  business: {
    defaultMarkupPercentage: number;
    freeDeliveryThreshold: number;
    standardDeliveryFee: number;
  };
  delivery: {
    expressRadiusKm: number;
    expressPromiseMinutes: number;
    standardPromiseMinutes: number;
  };
  runner: {
    acceptTimeoutMinutes: number;
    maxConcurrentOrders: number;
    dailyFloatLimit: number;
    commissionPerOrder: number;
    minFloatToClockIn: number;
    autoReassignEnabled: boolean;
    clockInRadiusMeters: number;
    skipClockInGeoCheck: boolean;
  };
  features: {
    carOwnerWebApp: boolean;
    mechanicWebApp: boolean;
    creditSystem: boolean;
    loyaltyDiscounts: boolean;
    maintenanceMode: boolean;
  };
  loyalty: LoyaltyThresholds;
  deliveryPricing: DeliveryPricingConfig;
}

export interface EffectiveAdminSetting {
  key: string;
  value: unknown;
  source: ConfigValueSource;
  envDefault: unknown;
}

function parseConfigInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function parseConfigFloat(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function parseConfigBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function parseTiers(value: unknown): DeliveryWeightTier[] {
  if (!Array.isArray(value)) return DEFAULT_DELIVERY_WEIGHT_TIERS;
  return value as DeliveryWeightTier[];
}

function parseEligibleTiers(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_FREE_DELIVERY_ELIGIBLE_TIERS;
  return value.filter((item): item is string => typeof item === 'string');
}

async function loadDbConfigMap(): Promise<Map<string, unknown>> {
  const keys = [
    ...ADMIN_RUNTIME_CONFIG_KEYS,
    'delivery_weight_tiers',
    'free_delivery_eligible_tiers',
  ];

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', keys);

    if (error || !data) return new Map();

    return new Map(
      (data as Array<{ key: string; value: unknown }>).map((row) => [row.key, row.value])
    );
  } catch {
    return new Map();
  }
}

function envDefaultForKey(key: string): unknown {
  switch (key) {
    case 'default_markup_percentage':
      return config.business.defaultMarkupPercentage;
    case 'free_delivery_threshold':
      return config.business.freeDeliveryThreshold;
    case 'standard_delivery_fee':
      return config.business.standardDeliveryFee;
    case 'express_delivery_radius_km':
      return config.delivery.expressRadiusKm;
    case 'express_delivery_promise_minutes':
      return config.delivery.expressPromiseMinutes;
    case 'standard_delivery_promise_minutes':
      return config.delivery.standardPromiseMinutes;
    case 'runner_accept_timeout_minutes':
      return config.runner.acceptTimeoutMinutes;
    case 'runner_max_concurrent_orders':
      return config.runner.maxConcurrentOrders;
    case 'runner_daily_float_limit':
      return config.runner.dailyFloatLimit;
    case 'runner_commission_per_order':
      return config.runner.commissionPerOrder;
    case 'loyalty_verified_min_orders':
      return config.loyalty.verifiedMinOrders;
    case 'loyalty_trusted_min_orders':
      return config.loyalty.trustedMinOrders;
    case 'loyalty_partner_min_orders':
      return config.loyalty.partnerMinOrders;
    case 'loyalty_partner_min_lifetime_spend':
      return config.loyalty.partnerMinLifetimeSpend;
    case 'loyalty_trusted_discount_percentage':
      return config.loyalty.trustedDiscountPercentage;
    case 'loyalty_partner_discount_percentage':
      return config.loyalty.partnerDiscountPercentage;
    case 'feature_car_owner_web_app':
      return config.features.carOwnerWebApp;
    case 'feature_mechanic_web_app':
      return config.features.mechanicWebApp;
    case 'feature_credit_system':
      return config.features.creditSystem;
    case 'feature_loyalty_discounts':
      return config.features.loyaltyDiscounts;
    case 'maintenance_mode':
      return config.features.maintenanceMode;
    default:
      return null;
  }
}

function readConfigValue<T>(
  db: Map<string, unknown>,
  key: string,
  fallback: T,
  parser: (value: unknown, fallback: T) => T
): T {
  if (!db.has(key)) return fallback;
  return parser(db.get(key), fallback);
}

export function buildRuntimeConfig(db: Map<string, unknown>): RuntimeConfig {
  const loyaltyDefaults = defaultLoyaltyThresholds();
  const deliveryDefaults = getDefaultDeliveryPricingConfig();

  const loyalty: LoyaltyThresholds = {
    verifiedMinOrders: readConfigValue(
      db,
      'loyalty_verified_min_orders',
      loyaltyDefaults.verifiedMinOrders,
      parseConfigInt
    ),
    trustedMinOrders: readConfigValue(
      db,
      'loyalty_trusted_min_orders',
      loyaltyDefaults.trustedMinOrders,
      parseConfigInt
    ),
    partnerMinOrders: readConfigValue(
      db,
      'loyalty_partner_min_orders',
      loyaltyDefaults.partnerMinOrders,
      parseConfigInt
    ),
    partnerMinLifetimeSpend: readConfigValue(
      db,
      'loyalty_partner_min_lifetime_spend',
      loyaltyDefaults.partnerMinLifetimeSpend,
      parseConfigInt
    ),
    trustedDiscountPercentage: readConfigValue(
      db,
      'loyalty_trusted_discount_percentage',
      loyaltyDefaults.trustedDiscountPercentage,
      parseConfigInt
    ),
    partnerDiscountPercentage: readConfigValue(
      db,
      'loyalty_partner_discount_percentage',
      loyaltyDefaults.partnerDiscountPercentage,
      parseConfigInt
    ),
  };

  const freeDeliveryThreshold = readConfigValue(
    db,
    'free_delivery_threshold',
    deliveryDefaults.freeDeliveryThreshold,
    parseConfigFloat
  );

  return {
    business: {
      defaultMarkupPercentage: readConfigValue(
        db,
        'default_markup_percentage',
        config.business.defaultMarkupPercentage,
        parseConfigFloat
      ),
      freeDeliveryThreshold,
      standardDeliveryFee: readConfigValue(
        db,
        'standard_delivery_fee',
        config.business.standardDeliveryFee,
        parseConfigFloat
      ),
    },
    delivery: {
      expressRadiusKm: readConfigValue(
        db,
        'express_delivery_radius_km',
        config.delivery.expressRadiusKm,
        parseConfigInt
      ),
      expressPromiseMinutes: readConfigValue(
        db,
        'express_delivery_promise_minutes',
        config.delivery.expressPromiseMinutes,
        parseConfigInt
      ),
      standardPromiseMinutes: readConfigValue(
        db,
        'standard_delivery_promise_minutes',
        config.delivery.standardPromiseMinutes,
        parseConfigInt
      ),
    },
    runner: {
      acceptTimeoutMinutes: readConfigValue(
        db,
        'runner_accept_timeout_minutes',
        config.runner.acceptTimeoutMinutes,
        parseConfigInt
      ),
      maxConcurrentOrders: readConfigValue(
        db,
        'runner_max_concurrent_orders',
        config.runner.maxConcurrentOrders,
        parseConfigInt
      ),
      dailyFloatLimit: readConfigValue(
        db,
        'runner_daily_float_limit',
        config.runner.dailyFloatLimit,
        parseConfigInt
      ),
      commissionPerOrder: readConfigValue(
        db,
        'runner_commission_per_order',
        config.runner.commissionPerOrder,
        parseConfigInt
      ),
      minFloatToClockIn: config.runner.minFloatToClockIn,
      autoReassignEnabled: config.runner.autoReassignEnabled,
      clockInRadiusMeters: config.runner.clockInRadiusMeters,
      skipClockInGeoCheck: config.runner.skipClockInGeoCheck,
    },
    features: {
      carOwnerWebApp: readConfigValue(
        db,
        'feature_car_owner_web_app',
        config.features.carOwnerWebApp,
        parseConfigBool
      ),
      mechanicWebApp: readConfigValue(
        db,
        'feature_mechanic_web_app',
        config.features.mechanicWebApp,
        parseConfigBool
      ),
      creditSystem: readConfigValue(
        db,
        'feature_credit_system',
        config.features.creditSystem,
        parseConfigBool
      ),
      loyaltyDiscounts: readConfigValue(
        db,
        'feature_loyalty_discounts',
        config.features.loyaltyDiscounts,
        parseConfigBool
      ),
      maintenanceMode: readConfigValue(
        db,
        'maintenance_mode',
        config.features.maintenanceMode,
        parseConfigBool
      ),
    },
    loyalty,
    deliveryPricing: {
      tiers: db.has('delivery_weight_tiers')
        ? parseTiers(db.get('delivery_weight_tiers'))
        : deliveryDefaults.tiers,
      freeDeliveryThreshold,
      freeDeliveryEligibleTiers: db.has('free_delivery_eligible_tiers')
        ? parseEligibleTiers(db.get('free_delivery_eligible_tiers'))
        : deliveryDefaults.freeDeliveryEligibleTiers,
    },
  };
}

export const getRuntimeConfig = cache(async (): Promise<RuntimeConfig> => {
  const db = await loadDbConfigMap();
  return buildRuntimeConfig(db);
});

/** Uncached — for middleware and other non-React request contexts. */
export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const db = await loadDbConfigMap();
  return buildRuntimeConfig(db);
}

export async function getEffectiveAdminSettings(): Promise<EffectiveAdminSetting[]> {
  const db = await loadDbConfigMap();
  const runtime = buildRuntimeConfig(db);

  const valueByKey: Record<string, unknown> = {
    default_markup_percentage: runtime.business.defaultMarkupPercentage,
    free_delivery_threshold: runtime.business.freeDeliveryThreshold,
    standard_delivery_fee: runtime.business.standardDeliveryFee,
    express_delivery_radius_km: runtime.delivery.expressRadiusKm,
    express_delivery_promise_minutes: runtime.delivery.expressPromiseMinutes,
    standard_delivery_promise_minutes: runtime.delivery.standardPromiseMinutes,
    runner_accept_timeout_minutes: runtime.runner.acceptTimeoutMinutes,
    runner_max_concurrent_orders: runtime.runner.maxConcurrentOrders,
    runner_daily_float_limit: runtime.runner.dailyFloatLimit,
    runner_commission_per_order: runtime.runner.commissionPerOrder,
    loyalty_verified_min_orders: runtime.loyalty.verifiedMinOrders,
    loyalty_trusted_min_orders: runtime.loyalty.trustedMinOrders,
    loyalty_partner_min_orders: runtime.loyalty.partnerMinOrders,
    loyalty_partner_min_lifetime_spend: runtime.loyalty.partnerMinLifetimeSpend,
    loyalty_trusted_discount_percentage: runtime.loyalty.trustedDiscountPercentage,
    loyalty_partner_discount_percentage: runtime.loyalty.partnerDiscountPercentage,
    feature_car_owner_web_app: runtime.features.carOwnerWebApp,
    feature_mechanic_web_app: runtime.features.mechanicWebApp,
    feature_credit_system: runtime.features.creditSystem,
    feature_loyalty_discounts: runtime.features.loyaltyDiscounts,
    maintenance_mode: runtime.features.maintenanceMode,
  };

  return ADMIN_SETTINGS_GROUPS.flatMap((group) =>
    group.keys.map((field) => ({
      key: field.key,
      value: valueByKey[field.key],
      source: db.has(field.key) ? ('database' as const) : ('env' as const),
      envDefault: envDefaultForKey(field.key),
    }))
  );
}
