import { createOrderSchema, cancelOrderSchema, rateOrderSchema } from '../order';

describe('createOrderSchema', () => {
  const validItem = {
    description: 'Brake pad',
    quantity: 1,
    price: 5000,
  };

  const validInput = {
    items: [validItem],
    deliveryAddress: '123 Test Street, Ikeja, Lagos',
    paymentMethod: 'wallet' as const,
  };

  it('accepts valid complete input', () => {
    const result = createOrderSchema.safeParse({
      ...validInput,
      items: [{
        ...validItem,
        partId: '550e8400-e29b-41d4-a716-446655440000',
        imageUrl: 'https://example.com/photo.jpg',
      }],
      vehicleId: '550e8400-e29b-41d4-a716-446655440000',
      deliveryLatitude: 6.5244,
      deliveryLongitude: 3.3792,
      deliveryNotes: 'Gate is red',
      sourceChannel: 'whatsapp',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid minimal input', () => {
    const result = createOrderSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = createOrderSchema.safeParse({
      ...validInput,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects item with empty description', () => {
    const result = createOrderSchema.safeParse({
      ...validInput,
      items: [{ ...validItem, description: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects item with negative price', () => {
    const result = createOrderSchema.safeParse({
      ...validInput,
      items: [{ ...validItem, price: -100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects item with zero price', () => {
    const result = createOrderSchema.safeParse({
      ...validInput,
      items: [{ ...validItem, price: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects short delivery address', () => {
    const result = createOrderSchema.safeParse({
      ...validInput,
      deliveryAddress: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid payment method', () => {
    const result = createOrderSchema.safeParse({
      ...validInput,
      paymentMethod: 'bitcoin',
    });
    expect(result.success).toBe(false);
  });

  it('defaults sourceChannel to "web"', () => {
    const result = createOrderSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceChannel).toBe('web');
    }
  });

  it('defaults quantity to 1', () => {
    const result = createOrderSchema.safeParse({
      ...validInput,
      items: [{ description: 'Part', price: 1000 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].quantity).toBe(1);
    }
  });

  it('rejects invalid imageUrl', () => {
    const result = createOrderSchema.safeParse({
      ...validInput,
      items: [{ ...validItem, imageUrl: 'not-a-url' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all three payment methods', () => {
    for (const method of ['wallet', 'card', 'cod'] as const) {
      const result = createOrderSchema.safeParse({
        ...validInput,
        paymentMethod: method,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('cancelOrderSchema', () => {
  it('accepts with reason', () => {
    const result = cancelOrderSchema.safeParse({ reason: 'Changed my mind' });
    expect(result.success).toBe(true);
  });

  it('accepts without reason', () => {
    const result = cancelOrderSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts empty string reason', () => {
    const result = cancelOrderSchema.safeParse({ reason: '' });
    expect(result.success).toBe(true);
  });
});

describe('rateOrderSchema', () => {
  it('accepts rating 1', () => {
    const result = rateOrderSchema.safeParse({ rating: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts rating 5', () => {
    const result = rateOrderSchema.safeParse({ rating: 5 });
    expect(result.success).toBe(true);
  });

  it('rejects rating < 1', () => {
    const result = rateOrderSchema.safeParse({ rating: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects rating > 5', () => {
    const result = rateOrderSchema.safeParse({ rating: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    const result = rateOrderSchema.safeParse({ rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it('accepts optional comment', () => {
    const result = rateOrderSchema.safeParse({ rating: 4, comment: 'Great!' });
    expect(result.success).toBe(true);
  });

  it('accepts without comment', () => {
    const result = rateOrderSchema.safeParse({ rating: 3 });
    expect(result.success).toBe(true);
  });
});
