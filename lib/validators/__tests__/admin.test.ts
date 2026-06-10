import {
  reassignOrderSchema,
  adminCancelOrderSchema,
  topUpFloatSchema,
  createVendorSchema,
  updateVendorSchema,
  updateConfigSchema,
} from '../admin';

describe('reassignOrderSchema', () => {
  it('accepts valid input', () => {
    const result = reassignOrderSchema.safeParse({
      assigneeId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'runner',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID assigneeId', () => {
    const result = reassignOrderSchema.safeParse({
      assigneeId: 'not-a-uuid',
      role: 'runner',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = reassignOrderSchema.safeParse({
      assigneeId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'admin',
    });
    expect(result.success).toBe(false);
  });

  it('accepts rider role', () => {
    const result = reassignOrderSchema.safeParse({
      assigneeId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'rider',
    });
    expect(result.success).toBe(true);
  });

  it('accepts dev seed UUIDs that are not RFC4122-variant', () => {
    const result = reassignOrderSchema.safeParse({
      assigneeId: 'd1000000-0000-0000-0000-000000000003',
      role: 'runner',
    });
    expect(result.success).toBe(true);
  });
});

describe('adminCancelOrderSchema', () => {
  it('accepts valid reason', () => {
    const result = adminCancelOrderSchema.safeParse({
      reason: 'Customer requested cancellation',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty reason', () => {
    const result = adminCancelOrderSchema.safeParse({ reason: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing reason', () => {
    const result = adminCancelOrderSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('topUpFloatSchema', () => {
  it('accepts positive amount', () => {
    const result = topUpFloatSchema.safeParse({ amount: 50000 });
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = topUpFloatSchema.safeParse({ amount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = topUpFloatSchema.safeParse({ amount: -1000 });
    expect(result.success).toBe(false);
  });
});

describe('createVendorSchema', () => {
  const validVendor = {
    name: 'Ade Parts',
    contact_phone: '08012345678',
    cluster_id: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('accepts valid input', () => {
    const result = createVendorSchema.safeParse(validVendor);
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const { name, ...rest } = validVendor;
    const result = createVendorSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createVendorSchema.safeParse({ ...validVendor, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing cluster_id', () => {
    const { cluster_id, ...rest } = validVendor;
    const result = createVendorSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID cluster_id', () => {
    const result = createVendorSchema.safeParse({
      ...validVendor,
      cluster_id: 'not-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = createVendorSchema.safeParse({
      ...validVendor,
      contact_name: 'Ade',
      location_in_market: 'Line 5, Shop 23',
      specializations: ['Toyota', 'Honda'],
      payment_terms: 'cash',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateVendorSchema', () => {
  it('accepts partial update', () => {
    const result = updateVendorSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('accepts all fields', () => {
    const result = updateVendorSchema.safeParse({
      name: 'Updated',
      contact_phone: '08099999999',
      is_active: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateVendorSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('updateConfigSchema', () => {
  it('accepts valid key and value', () => {
    const result = updateConfigSchema.safeParse({
      key: 'markup_percentage',
      value: 20,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty key', () => {
    const result = updateConfigSchema.safeParse({
      key: '',
      value: 'something',
    });
    expect(result.success).toBe(false);
  });

  it('accepts any value type', () => {
    expect(updateConfigSchema.safeParse({ key: 'a', value: 'string' }).success).toBe(true);
    expect(updateConfigSchema.safeParse({ key: 'a', value: 42 }).success).toBe(true);
    expect(updateConfigSchema.safeParse({ key: 'a', value: true }).success).toBe(true);
    expect(updateConfigSchema.safeParse({ key: 'a', value: { nested: true } }).success).toBe(true);
  });
});
