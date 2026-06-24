import { describe, expect, it } from 'vitest';
import { normalizeVendorName, vendorNamesLikelyMatch } from '@/lib/utils/vendor-name-match';

describe('normalizeVendorName', () => {
  it('trims and lowercases', () => {
    expect(normalizeVendorName('  Emeka Motors  ')).toBe('emeka motors');
  });

  it('collapses whitespace', () => {
    expect(normalizeVendorName('Emeka   Motors')).toBe('emeka motors');
  });
});

describe('vendorNamesLikelyMatch', () => {
  it('matches equivalent names', () => {
    expect(vendorNamesLikelyMatch('Emeka Motors', 'emeka motors')).toBe(true);
  });

  it('does not match different names', () => {
    expect(vendorNamesLikelyMatch('Emeka Motors', 'Mama Ngozi')).toBe(false);
  });
});
