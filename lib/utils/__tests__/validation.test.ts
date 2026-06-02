import { isValidNigerianPhone, phoneSchema, nigerianPhoneSchema } from '../validation';

describe('isValidNigerianPhone', () => {
  it('accepts valid local format (0801...)', () => {
    expect(isValidNigerianPhone('08012345678')).toBe(true);
  });

  it('accepts valid intl format (234801...)', () => {
    expect(isValidNigerianPhone('2348012345678')).toBe(true);
  });

  it('accepts +234 prefix (strips non-digits)', () => {
    expect(isValidNigerianPhone('+2348012345678')).toBe(true);
  });

  it('accepts 0901 prefix', () => {
    expect(isValidNigerianPhone('09012345678')).toBe(true);
  });

  it('accepts 0701 prefix', () => {
    expect(isValidNigerianPhone('07012345678')).toBe(true);
  });

  it('rejects too short', () => {
    expect(isValidNigerianPhone('0801234')).toBe(false);
  });

  it('rejects too long', () => {
    expect(isValidNigerianPhone('080123456789012')).toBe(false);
  });

  it('rejects invalid prefix', () => {
    expect(isValidNigerianPhone('06012345678')).toBe(false);
  });

  it('rejects non-numeric input', () => {
    expect(isValidNigerianPhone('abcdefghijk')).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('accepts valid phone string', () => {
    const result = phoneSchema.safeParse('08012345678');
    expect(result.success).toBe(true);
  });

  it('accepts phone with + prefix', () => {
    const result = phoneSchema.safeParse('+2348012345678');
    expect(result.success).toBe(true);
  });

  it('rejects too short (< 10)', () => {
    const result = phoneSchema.safeParse('080123');
    expect(result.success).toBe(false);
  });

  it('rejects too long (> 15)', () => {
    const result = phoneSchema.safeParse('1234567890123456');
    expect(result.success).toBe(false);
  });

  it('rejects letters', () => {
    const result = phoneSchema.safeParse('080abcd5678');
    expect(result.success).toBe(false);
  });
});

describe('nigerianPhoneSchema', () => {
  it('accepts 0-prefix Nigerian number', () => {
    const result = nigerianPhoneSchema.safeParse('08012345678');
    expect(result.success).toBe(true);
  });

  it('accepts 234-prefix Nigerian number', () => {
    const result = nigerianPhoneSchema.safeParse('2348012345678');
    expect(result.success).toBe(true);
  });

  it('accepts +234-prefix Nigerian number', () => {
    const result = nigerianPhoneSchema.safeParse('+2348012345678');
    expect(result.success).toBe(true);
  });

  it('rejects invalid prefix (060...)', () => {
    const result = nigerianPhoneSchema.safeParse('06012345678');
    expect(result.success).toBe(false);
  });

  it('rejects wrong length', () => {
    const result = nigerianPhoneSchema.safeParse('0801234');
    expect(result.success).toBe(false);
  });
});
