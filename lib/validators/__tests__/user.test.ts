import { updateProfileSchema, setupProfileSchema, createVehicleSchema } from '../user';

describe('updateProfileSchema', () => {
  it('accepts valid input', () => {
    const result = updateProfileSchema.safeParse({
      full_name: 'John Doe',
      email: 'john@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short name (< 2 chars)', () => {
    const result = updateProfileSchema.safeParse({ full_name: 'J' });
    expect(result.success).toBe(false);
  });

  it('rejects long name (> 100 chars)', () => {
    const result = updateProfileSchema.safeParse({
      full_name: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = updateProfileSchema.safeParse({
      full_name: 'John',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty string email', () => {
    const result = updateProfileSchema.safeParse({
      full_name: 'John',
      email: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional profile object', () => {
    const result = updateProfileSchema.safeParse({
      full_name: 'John',
      profile: { workshop_address: '123 Main St' },
    });
    expect(result.success).toBe(true);
  });
});

describe('setupProfileSchema', () => {
  it('accepts valid input', () => {
    const result = setupProfileSchema.safeParse({
      full_name: 'John Doe',
      delivery_address: '123 Test Street, Ikeja',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = setupProfileSchema.safeParse({
      delivery_address: '123 Test Street, Ikeja',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short address (< 5 chars)', () => {
    const result = setupProfileSchema.safeParse({
      full_name: 'John Doe',
      delivery_address: '123',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional email', () => {
    const result = setupProfileSchema.safeParse({
      full_name: 'John',
      delivery_address: '123 Test Street',
      email: 'john@example.com',
    });
    expect(result.success).toBe(true);
  });
});

describe('createVehicleSchema', () => {
  const validVehicle = {
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    is_primary: true,
  };

  it('accepts valid input', () => {
    const result = createVehicleSchema.safeParse(validVehicle);
    expect(result.success).toBe(true);
  });

  it('rejects year < 1980', () => {
    const result = createVehicleSchema.safeParse({
      ...validVehicle,
      year: 1979,
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid spec enum values', () => {
    for (const spec of ['American', 'European', 'Nigerian', 'Japanese', 'Other']) {
      const result = createVehicleSchema.safeParse({
        ...validVehicle,
        spec,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid spec value', () => {
    const result = createVehicleSchema.safeParse({
      ...validVehicle,
      spec: 'Korean',
    });
    expect(result.success).toBe(false);
  });

  it('requires is_primary', () => {
    const { is_primary, ...withoutPrimary } = validVehicle;
    const result = createVehicleSchema.safeParse(withoutPrimary);
    expect(result.success).toBe(false);
  });

  it('accepts optional nickname', () => {
    const result = createVehicleSchema.safeParse({
      ...validVehicle,
      nickname: 'My Car',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing make', () => {
    const { make, ...rest } = validVehicle;
    const result = createVehicleSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
