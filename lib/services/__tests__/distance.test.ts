import { calculateDistance, toRad } from '../orders';

describe('toRad', () => {
  it('converts 0 degrees to 0 radians', () => {
    expect(toRad(0)).toBe(0);
  });

  it('converts 180 degrees to PI', () => {
    expect(toRad(180)).toBeCloseTo(Math.PI);
  });

  it('converts 90 degrees to PI/2', () => {
    expect(toRad(90)).toBeCloseTo(Math.PI / 2);
  });
});

describe('calculateDistance', () => {
  it('returns 0 for the same point', () => {
    expect(calculateDistance(6.5244, 3.3792, 6.5244, 3.3792)).toBe(0);
  });

  it('calculates Lagos to Abuja (~534 km)', () => {
    // Lagos: 6.5244° N, 3.3792° E
    // Abuja: 9.0579° N, 7.4951° E
    const distance = calculateDistance(6.5244, 3.3792, 9.0579, 7.4951);
    expect(distance).toBeGreaterThan(500);
    expect(distance).toBeLessThan(600);
  });

  it('calculates a short distance (~9 km Ladipo to Ikeja)', () => {
    // Ladipo: 6.5215° N, 3.3405° E
    // Ikeja: 6.6018° N, 3.3515° E
    const distance = calculateDistance(6.5215, 3.3405, 6.6018, 3.3515);
    expect(distance).toBeGreaterThan(8);
    expect(distance).toBeLessThan(11);
  });

  it('is symmetric', () => {
    const d1 = calculateDistance(6.5244, 3.3792, 9.0579, 7.4951);
    const d2 = calculateDistance(9.0579, 7.4951, 6.5244, 3.3792);
    expect(d1).toBeCloseTo(d2);
  });
});
