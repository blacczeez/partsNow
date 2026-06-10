import { describe, it, expect } from 'vitest';
import {
  calculateDeliverySettlement,
  calculateReturnHandlingFee,
  getTotalPaid,
} from '../delivery-settlement';

const sampleOrder = {
  subtotal: 40000,
  markup_amount: 6000,
  delivery_fee: 1500,
  discount_amount: 0,
  total: 47500,
  revised_total: null as number | null,
};

describe('calculateReturnHandlingFee', () => {
  it('returns 0 when waived', () => {
    expect(calculateReturnHandlingFee(40000, true)).toBe(0);
  });

  it('applies flat + percentage with cap', () => {
    const fee = calculateReturnHandlingFee(40000, false);
    expect(fee).toBe(6000);
  });
});

describe('calculateDeliverySettlement', () => {
  it('full refund on platform fault', () => {
    const result = calculateDeliverySettlement({
      order: sampleOrder,
      fault: 'platform',
      partsRecoveryRate: 0,
    });
    expect(result.amountReturnedToCustomer).toBe(47500);
    expect(result.isFullRefund).toBe(true);
    expect(result.returnHandlingFee).toBe(0);
  });

  it('partial refund on customer fault with recovery', () => {
    const result = calculateDeliverySettlement({
      order: sampleOrder,
      fault: 'customer',
      partsRecoveryRate: 0.8,
      waiveReturnHandling: false,
    });
    expect(result.recoverableParts).toBe(32000);
    expect(result.returnHandlingFee).toBe(6000);
    expect(result.amountReturnedToCustomer).toBe(26000);
    expect(result.isFullRefund).toBe(false);
  });

  it('zero refund when parts not recoverable', () => {
    const result = calculateDeliverySettlement({
      order: sampleOrder,
      fault: 'customer',
      partsRecoveryRate: 0,
    });
    expect(result.amountReturnedToCustomer).toBe(0);
  });
});

describe('getTotalPaid', () => {
  it('uses revised_total when set', () => {
    expect(getTotalPaid({ ...sampleOrder, revised_total: 50000 })).toBe(50000);
  });
});
