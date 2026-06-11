import {
  reassignOrderSchema,
  adminCancelOrderSchema,
  topUpFloatSchema,
  createVendorSchema,
  updateVendorSchema,
  updateConfigSchema,
  createPartSchema,
  updatePartSchema,
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

describe('createPartCategorySchema', () => {
  it('accepts valid category', async () => {
    const { createPartCategorySchema } = await import('../admin');
    const result = createPartCategorySchema.safeParse({ name: 'Brakes' });
    expect(result.success).toBe(true);
  });
});

describe('createPartSchema', () => {
  const validPart = {
    name: 'Brake Pad Set',
    category_id: '00000000-0000-0000-0000-000000000001',
    weight_kg: 2.5,
  };

  it('accepts valid input with required fields only', () => {
    const result = createPartSchema.safeParse(validPart);
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const { name, ...rest } = validPart;
    const result = createPartSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createPartSchema.safeParse({ ...validPart, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing category_id', () => {
    const { category_id, ...rest } = validPart;
    const result = createPartSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing weight_kg', () => {
    const { weight_kg, ...rest } = validPart;
    const result = createPartSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid category_id', () => {
    const result = createPartSchema.safeParse({ ...validPart, category_id: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts all optional fields', () => {
    const result = createPartSchema.safeParse({
      ...validPart,
      subcategory: 'Front Brakes',
      oem_code: 'BP-12345',
      average_price: 15000,
      weight_kg: 2.5,
      image_url: 'https://example.com/brake.jpg',
      compatible_vehicles: [
        { make: 'Toyota', model: 'Camry', year_start: 2015, year_end: 2020 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative average_price', () => {
    const result = createPartSchema.safeParse({ ...validPart, average_price: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects zero average_price', () => {
    const result = createPartSchema.safeParse({ ...validPart, average_price: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid image_url', () => {
    const result = createPartSchema.safeParse({ ...validPart, image_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});

describe('updatePartSchema', () => {
  it('accepts partial update', () => {
    const result = updatePartSchema.safeParse({ name: 'Updated Brake Pad' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updatePartSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts is_active field', () => {
    const result = updatePartSchema.safeParse({ is_active: false });
    expect(result.success).toBe(true);
  });

  it('accepts all fields together', () => {
    const result = updatePartSchema.safeParse({
      name: 'Updated',
      category_id: '00000000-0000-0000-0000-000000000002',
      subcategory: 'Oil Filter',
      oem_code: 'OF-999',
      average_price: 5000,
      weight_kg: 0.5,
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name when provided', () => {
    const result = updatePartSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category_id when provided', () => {
    const result = updatePartSchema.safeParse({ category_id: 'not-uuid' });
    expect(result.success).toBe(false);
  });
});
