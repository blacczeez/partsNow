import { describe, it, expect } from 'vitest';
import {
  computeVendorBudget,
  isVendorPriceOverBudget,
} from '../vendor-budget';

describe('computeVendorBudget', () => {
  it('derives target vendor price from customer selling price (no tolerance band)', () => {
    const { expectedVendorPrice, maxVendorPrice } = computeVendorBudget(11500, 15);
    expect(expectedVendorPrice).toBe(10000);
    expect(maxVendorPrice).toBe(10000);
  });

  it('escalates when vendor price exceeds target (not at target)', () => {
    const sellingPrice = 11500;
    expect(isVendorPriceOverBudget(10000, sellingPrice)).toBe(false);
    expect(isVendorPriceOverBudget(10001, sellingPrice)).toBe(true);
  });
});

describe('user scenario: ₦3,200 order with ₦4,000 vendor price', () => {
  it('escalates when vendor price exceeds target budget', () => {
    const { expectedVendorPrice } = computeVendorBudget(1700);
    expect(expectedVendorPrice).toBeLessThan(4000);
    expect(isVendorPriceOverBudget(4000, 1700)).toBe(true);
  });
});
