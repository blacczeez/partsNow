import {
  calculateDeliveryFee,
  computeTotalWeightKg,
  resolveDeliveryTier,
  validateDeliveryTiers,
} from '../delivery-pricing';
import { getDefaultDeliveryPricingConfig } from '@/lib/constants/delivery-tiers';

describe('computeTotalWeightKg', () => {
  it('sums weight × quantity', () => {
    expect(
      computeTotalWeightKg([
        { weight_kg: 2, quantity: 3 },
        { weight_kg: 1.5, quantity: 2 },
      ])
    ).toBe(9);
  });
});

describe('resolveDeliveryTier', () => {
  const config = getDefaultDeliveryPricingConfig();

  it('resolves light tier at 4 kg', () => {
    expect(resolveDeliveryTier(4, config.tiers).id).toBe('light');
  });

  it('resolves medium tier at 10 kg', () => {
    expect(resolveDeliveryTier(10, config.tiers).id).toBe('medium');
  });

  it('resolves heavy tier at 25 kg', () => {
    expect(resolveDeliveryTier(25, config.tiers).id).toBe('heavy');
  });

  it('resolves oversized tier at 50 kg', () => {
    expect(resolveDeliveryTier(50, config.tiers).id).toBe('oversized');
  });
});

describe('calculateDeliveryFee', () => {
  const config = getDefaultDeliveryPricingConfig();

  it('charges light tier fee below free threshold', () => {
    const result = calculateDeliveryFee(10000, 3, config);
    expect(result.deliveryFee).toBe(1500);
    expect(result.tierId).toBe('light');
    expect(result.freeDeliveryApplied).toBe(false);
  });

  it('applies free delivery for light tier when subtotal >= threshold', () => {
    const result = calculateDeliveryFee(50000, 4, config);
    expect(result.deliveryFee).toBe(0);
    expect(result.freeDeliveryApplied).toBe(true);
    expect(result.tierId).toBe('light');
  });

  it('applies free delivery for medium tier when subtotal >= threshold', () => {
    const result = calculateDeliveryFee(60000, 12, config);
    expect(result.deliveryFee).toBe(0);
    expect(result.tierId).toBe('medium');
  });

  it('does not apply free delivery for heavy tier even above threshold', () => {
    const result = calculateDeliveryFee(60000, 20, config);
    expect(result.deliveryFee).toBe(4000);
    expect(result.freeDeliveryApplied).toBe(false);
    expect(result.deliveryType).toBe('standard');
  });

  it('uses standard delivery for heavy tier', () => {
    const result = calculateDeliveryFee(10000, 20, config);
    expect(result.deliveryType).toBe('standard');
    expect(result.promisedMinutes).toBe(120);
  });
});

describe('validateDeliveryTiers', () => {
  it('accepts default tiers', () => {
    expect(validateDeliveryTiers(getDefaultDeliveryPricingConfig().tiers)).toBeNull();
  });

  it('rejects empty tiers', () => {
    expect(validateDeliveryTiers([])).toMatch(/At least one/);
  });
});
