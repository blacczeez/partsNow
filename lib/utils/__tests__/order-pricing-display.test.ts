import { describe, it, expect } from 'vitest';
import {
  catalogLineTotal,
  catalogUnitPrice,
  customerLineTotal,
  customerPartsTotal,
  listedLineTotal,
  partPricingFromVendorUnit,
  quotedServiceFeeLine,
  runnerLineExpectedBudget,
  runnerSourcingTargetTotal,
} from '../order-pricing-display';

describe('order-pricing-display', () => {
  const items = [
    {
      quantity: 2,
      selling_price: 1150,
      max_vendor_price: 1000,
      expected_vendor_price: 1000,
      is_unavailable: false,
    },
    {
      quantity: 1,
      selling_price: 575,
      max_vendor_price: 500,
      expected_vendor_price: 500,
      is_unavailable: false,
    },
  ];

  it('computes customer line and parts totals', () => {
    expect(customerLineTotal(items[0])).toBe(2300);
    expect(customerPartsTotal(items)).toBe(2875);
  });

  it('computes catalog prices from order markup rate', () => {
    expect(catalogUnitPrice(items[0], 2000, 300)).toBe(1000);
    expect(catalogLineTotal(items[0], 2000, 300)).toBe(2000);
  });

  it('splits listed price and service fee for admin price review', () => {
    expect(listedLineTotal(items[0])).toBe(2000);
    expect(customerLineTotal(items[0])).toBe(2300);
    expect(quotedServiceFeeLine(items[0])).toBe(300);
    expect(partPricingFromVendorUnit(13000, 1)).toEqual({
      listedLine: 13000,
      serviceFee: 1950,
      partTotal: 14950,
    });
  });

  it('computes runner sourcing target from expected vendor prices', () => {
    expect(runnerLineExpectedBudget(items[0])).toBe(2000);
    expect(runnerSourcingTargetTotal(items)).toBe(2500);
  });

  it('excludes unavailable items from sourcing target', () => {
    const withUnavailable = [
      ...items,
      {
        quantity: 1,
        selling_price: 1000,
        max_vendor_price: 870,
        expected_vendor_price: 870,
        is_unavailable: true,
      },
    ];
    expect(runnerSourcingTargetTotal(withUnavailable)).toBe(2500);
  });
});
