import { describe, expect, it } from 'vitest';
import { combineVendorPartRows } from '@/lib/utils/vendor-merge';

describe('combineVendorPartRows', () => {
  it('combines price counts and weighted average', () => {
    const result = combineVendorPartRows(
      {
        last_price: 1000,
        price_count: 2,
        average_price: 1000,
        last_seen_at: '2026-01-01T00:00:00Z',
      },
      {
        last_price: 2000,
        price_count: 2,
        average_price: 2000,
        last_seen_at: '2026-02-01T00:00:00Z',
      }
    );

    expect(result.price_count).toBe(4);
    expect(result.average_price).toBe(1500);
    expect(result.last_price).toBe(2000);
    expect(result.last_seen_at).toBe('2026-02-01T00:00:00Z');
  });

  it('keeps newer keep row when merge is older', () => {
    const result = combineVendorPartRows(
      {
        last_price: 3000,
        price_count: 5,
        average_price: 2800,
        last_seen_at: '2026-03-01T00:00:00Z',
      },
      {
        last_price: 1000,
        price_count: 1,
        average_price: 1000,
        last_seen_at: '2026-01-01T00:00:00Z',
      }
    );

    expect(result.last_price).toBe(3000);
    expect(result.last_seen_at).toBe('2026-03-01T00:00:00Z');
  });
});
