import { topUpSchema, transactionsQuerySchema } from '../wallet';

describe('topUpSchema', () => {
  it('accepts minimum amount (5000)', () => {
    const result = topUpSchema.safeParse({ amount: 5000 });
    expect(result.success).toBe(true);
  });

  it('accepts maximum amount (500000)', () => {
    const result = topUpSchema.safeParse({ amount: 500000 });
    expect(result.success).toBe(true);
  });

  it('rejects below minimum (4999)', () => {
    const result = topUpSchema.safeParse({ amount: 4999 });
    expect(result.success).toBe(false);
  });

  it('rejects above maximum (500001)', () => {
    const result = topUpSchema.safeParse({ amount: 500001 });
    expect(result.success).toBe(false);
  });

  it('accepts mid-range amount', () => {
    const result = topUpSchema.safeParse({ amount: 25000 });
    expect(result.success).toBe(true);
  });
});

describe('transactionsQuerySchema', () => {
  it('uses defaults for empty object', () => {
    const result = transactionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
    }
  });

  it('coerces string numbers', () => {
    const result = transactionsQuerySchema.safeParse({ page: '2', limit: '20' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejects limit > 50', () => {
    const result = transactionsQuerySchema.safeParse({ limit: 51 });
    expect(result.success).toBe(false);
  });

  it('rejects limit < 1', () => {
    const result = transactionsQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive page', () => {
    const result = transactionsQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });
});
