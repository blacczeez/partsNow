import { describe, it, expect } from 'vitest';
import { lineSourcingSavings, sumSourcingSavings } from '../sourcing-savings';

describe('lineSourcingSavings', () => {
  it('returns savings when vendor paid below target', () => {
    expect(
      lineSourcingSavings({
        quantity: 2,
        vendor_price: 9500,
        expected_vendor_price: 10000,
        is_found: true,
      })
    ).toBe(1000);
  });

  it('returns zero when vendor paid at or above target', () => {
    expect(
      lineSourcingSavings({
        quantity: 1,
        vendor_price: 10000,
        expected_vendor_price: 10000,
      })
    ).toBe(0);
    expect(
      lineSourcingSavings({
        quantity: 1,
        vendor_price: 10500,
        expected_vendor_price: 10000,
      })
    ).toBe(0);
  });

  it('returns zero when prices are missing or item not found', () => {
    expect(
      lineSourcingSavings({
        quantity: 1,
        vendor_price: null,
        expected_vendor_price: 10000,
      })
    ).toBe(0);
    expect(
      lineSourcingSavings({
        quantity: 1,
        vendor_price: 9000,
        expected_vendor_price: null,
      })
    ).toBe(0);
    expect(
      lineSourcingSavings({
        quantity: 1,
        vendor_price: 9000,
        expected_vendor_price: 10000,
        is_found: false,
      })
    ).toBe(0);
  });
});

describe('sumSourcingSavings', () => {
  it('sums savings across line items', () => {
    expect(
      sumSourcingSavings([
        {
          quantity: 1,
          vendor_price: 9500,
          expected_vendor_price: 10000,
        },
        {
          quantity: 2,
          vendor_price: 4800,
          expected_vendor_price: 5000,
        },
      ])
    ).toBe(900);
  });
});
