import {
  confirmPickupSchema,
  confirmDeliverySchema,
  reportFailureSchema,
  updateLocationSchema,
} from '../rider';

describe('confirmPickupSchema', () => {
  it('accepts with photo', () => {
    const result = confirmPickupSchema.safeParse({
      pickupPhotoUrl: 'https://example.com/photo.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('accepts without photo', () => {
    const result = confirmPickupSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('confirmDeliverySchema', () => {
  it('accepts with all optional fields', () => {
    const result = confirmDeliverySchema.safeParse({
      photoUrl: 'https://example.com/photo.jpg',
      codAmountCollected: 15000,
    });
    expect(result.success).toBe(true);
  });

  it('accepts with no optional fields', () => {
    const result = confirmDeliverySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts with only photoUrl', () => {
    const result = confirmDeliverySchema.safeParse({
      photoUrl: 'https://example.com/photo.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('accepts with only codAmountCollected', () => {
    const result = confirmDeliverySchema.safeParse({
      codAmountCollected: 5000,
    });
    expect(result.success).toBe(true);
  });
});

describe('reportFailureSchema', () => {
  it('accepts customer_unavailable', () => {
    const result = reportFailureSchema.safeParse({
      reason: 'customer_unavailable',
    });
    expect(result.success).toBe(true);
  });

  it('accepts customer_refused', () => {
    const result = reportFailureSchema.safeParse({
      reason: 'customer_refused',
    });
    expect(result.success).toBe(true);
  });

  it('accepts wrong_address', () => {
    const result = reportFailureSchema.safeParse({
      reason: 'wrong_address',
    });
    expect(result.success).toBe(true);
  });

  it('accepts other', () => {
    const result = reportFailureSchema.safeParse({
      reason: 'other',
      notes: 'Road blocked',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid reason', () => {
    const result = reportFailureSchema.safeParse({
      reason: 'bad_weather',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional notes and photoUrl', () => {
    const result = reportFailureSchema.safeParse({
      reason: 'customer_unavailable',
      notes: 'Called twice',
      photoUrl: 'https://example.com/photo.jpg',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateLocationSchema', () => {
  it('accepts valid coordinates', () => {
    const result = updateLocationSchema.safeParse({
      latitude: 6.5244,
      longitude: 3.3792,
    });
    expect(result.success).toBe(true);
  });

  it('accepts with etaMinutes', () => {
    const result = updateLocationSchema.safeParse({
      latitude: 6.5244,
      longitude: 3.3792,
      etaMinutes: 15,
    });
    expect(result.success).toBe(true);
  });

  it('accepts without etaMinutes', () => {
    const result = updateLocationSchema.safeParse({
      latitude: 6.5244,
      longitude: 3.3792,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-positive etaMinutes', () => {
    const result = updateLocationSchema.safeParse({
      latitude: 6.5244,
      longitude: 3.3792,
      etaMinutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative etaMinutes', () => {
    const result = updateLocationSchema.safeParse({
      latitude: 6.5244,
      longitude: 3.3792,
      etaMinutes: -5,
    });
    expect(result.success).toBe(false);
  });
});
