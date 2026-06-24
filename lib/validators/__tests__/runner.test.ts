import {
  startShiftSchema,
  endShiftSchema,
  rejectOrderSchema,
  markItemFoundSchema,
  markItemUnavailableSchema,
  clarifyOrderSchema,
} from '../runner';

describe('startShiftSchema', () => {
  it('accepts valid coordinates', () => {
    const result = startShiftSchema.safeParse({ latitude: 6.5244, longitude: 3.3792 });
    expect(result.success).toBe(true);
  });

  it('rejects missing latitude', () => {
    const result = startShiftSchema.safeParse({ longitude: 3.3792 });
    expect(result.success).toBe(false);
  });

  it('rejects missing longitude', () => {
    const result = startShiftSchema.safeParse({ latitude: 6.5244 });
    expect(result.success).toBe(false);
  });
});

describe('endShiftSchema', () => {
  it('accepts with notes', () => {
    const result = endShiftSchema.safeParse({ notes: 'Good day' });
    expect(result.success).toBe(true);
  });

  it('accepts without notes', () => {
    const result = endShiftSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts empty string notes', () => {
    const result = endShiftSchema.safeParse({ notes: '' });
    expect(result.success).toBe(true);
  });
});

describe('rejectOrderSchema', () => {
  it('accepts valid reason', () => {
    const result = rejectOrderSchema.safeParse({ reason: 'Too far away' });
    expect(result.success).toBe(true);
  });

  it('rejects empty reason', () => {
    const result = rejectOrderSchema.safeParse({ reason: '' });
    expect(result.success).toBe(false);
  });
});

describe('markItemFoundSchema', () => {
  const base = {
    vendorId: '550e8400-e29b-41d4-a716-446655440000',
    vendorPrice: 5000,
    qcImageUrl: 'https://example.com/photo.jpg',
  };

  it('accepts valid input with vendorId', () => {
    const result = markItemFoundSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('accepts quickAddVendor instead of vendorId', () => {
    const result = markItemFoundSchema.safeParse({
      quickAddVendor: { name: 'Emeka @ Line 12' },
      vendorPrice: 5000,
      qcImageUrl: 'https://example.com/photo.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when vendor is missing', () => {
    const result = markItemFoundSchema.safeParse({
      vendorPrice: 5000,
      qcImageUrl: 'https://example.com/photo.jpg',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative vendorPrice', () => {
    const result = markItemFoundSchema.safeParse({
      ...base,
      vendorPrice: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero vendorPrice', () => {
    const result = markItemFoundSchema.safeParse({
      ...base,
      vendorPrice: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing qcImageUrl', () => {
    const { qcImageUrl: _, ...rest } = base;
    const result = markItemFoundSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty qcImageUrl', () => {
    const result = markItemFoundSchema.safeParse({
      ...base,
      qcImageUrl: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional vendorId with quickAdd omitted', () => {
    const result = markItemFoundSchema.safeParse({
      vendorId: '550e8400-e29b-41d4-a716-446655440000',
      vendorPrice: 5000,
      qcImageUrl: 'photo.jpg',
    });
    expect(result.success).toBe(true);
  });
});

describe('markItemUnavailableSchema', () => {
  it('accepts valid reason', () => {
    const result = markItemUnavailableSchema.safeParse({ reason: 'Out of stock' });
    expect(result.success).toBe(true);
  });

  it('rejects empty reason', () => {
    const result = markItemUnavailableSchema.safeParse({ reason: '' });
    expect(result.success).toBe(false);
  });
});

describe('clarifyOrderSchema', () => {
  it('accepts valid message', () => {
    const result = clarifyOrderSchema.safeParse({ message: 'Which year model?' });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = clarifyOrderSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects message > 1000 chars', () => {
    const result = clarifyOrderSchema.safeParse({ message: 'A'.repeat(1001) });
    expect(result.success).toBe(false);
  });

  it('accepts message at 1000 chars', () => {
    const result = clarifyOrderSchema.safeParse({ message: 'A'.repeat(1000) });
    expect(result.success).toBe(true);
  });
});
