import { getMarkupPercentage, calculatePricing, isCodAllowed } from '../pricing';
import { config } from '@/lib/config';
import { getDefaultDeliveryPricingConfig } from '@/lib/constants/delivery-tiers';

const deliveryConfig = getDefaultDeliveryPricingConfig();
const lightItem = { price: 10000, quantity: 1, weightKg: 2 };
const heavyItem = { price: 10000, quantity: 1, weightKg: 20 };

// Mock config for tests that need to toggle features
vi.mock('@/lib/config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/config')>('@/lib/config');
  return {
    config: {
      ...actual.config,
      // Spread all nested so we can override selectively
      business: { ...actual.config.business },
      loyalty: { ...actual.config.loyalty },
      payments: { ...actual.config.payments },
      features: { ...actual.config.features },
    },
  };
});

describe('getMarkupPercentage', () => {
  beforeEach(() => {
    // Reset to defaults
    (config.features as { loyaltyDiscounts: boolean }).loyaltyDiscounts = true;
  });

  it('returns 15% for "new" tier', () => {
    expect(getMarkupPercentage('new')).toBe(15);
  });

  it('returns 15% for "verified" tier (no discount)', () => {
    expect(getMarkupPercentage('verified')).toBe(15);
  });

  it('returns 10% for "trusted" tier (5% discount)', () => {
    expect(getMarkupPercentage('trusted')).toBe(10);
  });

  it('returns 7% for "partner" tier (8% discount)', () => {
    expect(getMarkupPercentage('partner')).toBe(7);
  });

  it('returns base 15% for all tiers when loyalty disabled', () => {
    (config.features as { loyaltyDiscounts: boolean }).loyaltyDiscounts = false;
    expect(getMarkupPercentage('partner')).toBe(15);
    expect(getMarkupPercentage('trusted')).toBe(15);
    expect(getMarkupPercentage('new')).toBe(15);
  });
});

describe('calculatePricing', () => {
  beforeEach(() => {
    (config.features as { loyaltyDiscounts: boolean }).loyaltyDiscounts = true;
  });

  it('calculates single item correctly', () => {
    const result = calculatePricing([lightItem], 'new', deliveryConfig);
    expect(result.subtotal).toBe(10000);
    expect(result.markupAmount).toBe(1500); // 15%
    expect(result.deliveryFee).toBe(1500); // light tier below threshold
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(13000);
    expect(result.totalWeightKg).toBe(2);
  });

  it('calculates multi-item correctly', () => {
    const result = calculatePricing(
      [
        { price: 5000, quantity: 2, weightKg: 1 },
        { price: 3000, quantity: 1, weightKg: 2 },
      ],
      'new',
      deliveryConfig
    );
    expect(result.subtotal).toBe(13000);
    expect(result.markupAmount).toBe(1950);
    expect(result.deliveryFee).toBe(1500);
    expect(result.total).toBe(16450);
    expect(result.totalWeightKg).toBe(4);
  });

  it('applies free delivery when subtotal >= 50000 on light tier', () => {
    const result = calculatePricing(
      [{ price: 50000, quantity: 1, weightKg: 3 }],
      'new',
      deliveryConfig
    );
    expect(result.deliveryFee).toBe(0);
    expect(result.freeDeliveryApplied).toBe(true);
  });

  it('charges delivery fee for heavy tier even above threshold', () => {
    const result = calculatePricing(
      [{ price: 60000, quantity: 1, weightKg: 20 }],
      'new',
      deliveryConfig
    );
    expect(result.deliveryFee).toBe(4000);
    expect(result.freeDeliveryApplied).toBe(false);
  });

  it('charges delivery fee when subtotal < 50000', () => {
    const result = calculatePricing([lightItem], 'new', deliveryConfig);
    expect(result.deliveryFee).toBe(1500);
  });

  it('applies trusted tier discount', () => {
    const result = calculatePricing([lightItem], 'trusted', deliveryConfig);
    // trusted = 15 - 5 = 10% markup
    expect(result.markupAmount).toBe(1000);
  });

  it('applies partner tier discount', () => {
    const result = calculatePricing([lightItem], 'partner', deliveryConfig);
    // partner = 15 - 8 = 7% markup
    expect(result.markupAmount).toBe(700);
  });

  it('defaults to "new" tier', () => {
    const result = calculatePricing([lightItem], 'new', deliveryConfig);
    expect(result.markupAmount).toBe(1500); // 15%
  });

  it('rounds markup amount', () => {
    const result = calculatePricing(
      [{ price: 333, quantity: 1, weightKg: 1 }],
      'new',
      deliveryConfig
    );
    // 15% of 333 = 49.95 → rounds to 50
    expect(result.markupAmount).toBe(50);
  });
});

describe('isCodAllowed', () => {
  beforeEach(() => {
    (config.payments as { codEnabled: boolean }).codEnabled = true;
  });

  it('returns true when total <= 100000 and COD enabled', () => {
    expect(isCodAllowed(100000)).toBe(true);
  });

  it('returns false when total > 100000', () => {
    expect(isCodAllowed(100001)).toBe(false);
  });

  it('returns false when COD is disabled', () => {
    (config.payments as { codEnabled: boolean }).codEnabled = false;
    expect(isCodAllowed(50000)).toBe(false);
  });

  it('returns true for small amounts', () => {
    expect(isCodAllowed(1000)).toBe(true);
  });
});
