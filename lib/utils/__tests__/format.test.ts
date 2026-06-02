import {
  formatCurrency,
  formatRelativeTime,
  formatPhone,
  normalizePhone,
} from '../format';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0');
  });

  it('formats 1500', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1,500');
    expect(result).toContain('₦');
  });

  it('formats 50000', () => {
    expect(formatCurrency(50000)).toContain('50,000');
  });

  it('formats negative numbers', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for less than 1 minute ago', () => {
    const date = new Date('2024-06-15T11:59:30Z');
    expect(formatRelativeTime(date)).toBe('Just now');
  });

  it('returns minutes for < 60 min', () => {
    const date = new Date('2024-06-15T11:35:00Z');
    expect(formatRelativeTime(date)).toBe('25m ago');
  });

  it('returns hours for < 24h', () => {
    const date = new Date('2024-06-15T09:00:00Z');
    expect(formatRelativeTime(date)).toBe('3h ago');
  });

  it('returns days for < 7d', () => {
    const date = new Date('2024-06-13T12:00:00Z');
    expect(formatRelativeTime(date)).toBe('2d ago');
  });

  it('returns formatted date for >= 7 days', () => {
    const date = new Date('2024-06-01T12:00:00Z');
    const result = formatRelativeTime(date);
    // Should contain "Jun" and "1"
    expect(result).toContain('Jun');
    expect(result).toContain('1');
  });

  it('accepts string dates', () => {
    expect(formatRelativeTime('2024-06-15T11:55:00Z')).toBe('5m ago');
  });
});

describe('formatPhone', () => {
  it('formats a 234-prefix number', () => {
    const result = formatPhone('2348012345678');
    expect(result).toBe('+234 801 234 5678');
  });

  it('returns non-234 numbers unchanged', () => {
    expect(formatPhone('08012345678')).toBe('08012345678');
  });

  it('strips non-digit characters before formatting', () => {
    const result = formatPhone('+234-801-234-5678');
    expect(result).toBe('+234 801 234 5678');
  });
});

describe('normalizePhone', () => {
  it('converts 0-prefix to 234-prefix', () => {
    expect(normalizePhone('08012345678')).toBe('2348012345678');
  });

  it('leaves 234-prefix unchanged', () => {
    expect(normalizePhone('2348012345678')).toBe('2348012345678');
  });

  it('strips non-digit characters', () => {
    expect(normalizePhone('+234-801-234-5678')).toBe('2348012345678');
  });

  it('prepends 234 if no recognized prefix', () => {
    expect(normalizePhone('8012345678')).toBe('2348012345678');
  });
});
