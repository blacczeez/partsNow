import { describe, expect, it } from 'vitest';
import {
  formatAdminDateRangeLabel,
  getDefaultAdminDateRange,
  parseAdminDateRange,
  toIsoDate,
} from '@/lib/utils/admin-date-range';

describe('parseAdminDateRange', () => {
  it('parses legacy single date param', () => {
    const range = parseAdminDateRange({ date: '2026-06-01' });
    expect(range.allTime).toBe(false);
    expect(range.fromIso).toBe('2026-06-01');
    expect(range.toIso).toBe('2026-06-01');
  });

  it('parses all time preset', () => {
    const range = parseAdminDateRange({ preset: 'allTime' });
    expect(range.allTime).toBe(true);
    expect(range.from).toBeNull();
    expect(range.to).toBeNull();
  });

  it('parses custom from/to range', () => {
    const range = parseAdminDateRange({
      preset: 'custom',
      from: '2026-06-01',
      to: '2026-06-10',
    });
    expect(range.fromIso).toBe('2026-06-01');
    expect(range.toIso).toBe('2026-06-10');
  });

  it('swaps inverted custom range', () => {
    const range = parseAdminDateRange({
      preset: 'custom',
      from: '2026-06-10',
      to: '2026-06-01',
    });
    expect(range.fromIso).toBe('2026-06-01');
    expect(range.toIso).toBe('2026-06-10');
  });

  it('defaults to last 7 days', () => {
    const range = parseAdminDateRange({});
    expect(range.preset).toBe('last7');
    expect(range.allTime).toBe(false);
    expect(range.fromIso).toBeTruthy();
    expect(range.toIso).toBeTruthy();
  });
});

describe('getDefaultAdminDateRange', () => {
  it('returns today for today preset', () => {
    const value = getDefaultAdminDateRange('today');
    expect(value.preset).toBe('today');
    expect(value.from).toBe(value.to);
    expect(value.from).toBe(toIsoDate(new Date()));
  });

  it('returns empty dates for all time', () => {
    const value = getDefaultAdminDateRange('allTime');
    expect(value.preset).toBe('allTime');
    expect(value.from).toBe('');
    expect(value.to).toBe('');
  });
});

describe('formatAdminDateRangeLabel', () => {
  it('labels all time', () => {
    expect(
      formatAdminDateRangeLabel(parseAdminDateRange({ preset: 'allTime' }))
    ).toBe('All time');
  });

  it('labels single day', () => {
    const label = formatAdminDateRangeLabel(parseAdminDateRange({ date: '2026-06-03' }));
    expect(label).toContain('2026');
  });
});
