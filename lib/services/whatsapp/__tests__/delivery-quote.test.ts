import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '@/lib/__tests__/helpers';
import { createServiceClient } from '@/lib/supabase/service';
import {
  estimateWhatsAppOrderWeight,
  formatWhatsAppDeliveryQuoteMessage,
  totalWeightFromItems,
  WHATSAPP_DEFAULT_ESTIMATE_KG,
} from '../delivery-quote';
import { getDefaultDeliveryPricingConfig } from '@/lib/constants/delivery-tiers';
import { calculateDeliveryFee } from '@/lib/utils/delivery-pricing';

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/services/delivery-config', () => ({
  getDeliveryPricingConfig: vi.fn(async () => getDefaultDeliveryPricingConfig()),
}));

const mockedCreateServiceClient = vi.mocked(createServiceClient);

describe('estimateWhatsAppOrderWeight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses catalogue part weight when matched', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateServiceClient.mockReturnValue(mockSupabase);

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ name: 'Brake Pad Set', weight_kg: 2.5 }],
        error: null,
      }),
    }));

    const result = await estimateWhatsAppOrderWeight('brake pads toyota');
    expect(result.totalWeightKg).toBe(2.5);
    expect(result.matchedPartName).toBe('Brake Pad Set');
  });

  it('falls back to default estimate when no catalogue match', async () => {
    const { mockSupabase } = createMockSupabase();
    mockedCreateServiceClient.mockReturnValue(mockSupabase);

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    const result = await estimateWhatsAppOrderWeight('custom fabricated part');
    expect(result.totalWeightKg).toBe(WHATSAPP_DEFAULT_ESTIMATE_KG);
    expect(result.matchedPartName).toBeNull();
  });
});

describe('formatWhatsAppDeliveryQuoteMessage', () => {
  it('includes tier and delivery fee', () => {
    const delivery = calculateDeliveryFee(0, 12, getDefaultDeliveryPricingConfig());
    const message = formatWhatsAppDeliveryQuoteMessage('shock absorber', {
      weight: { totalWeightKg: 12, estimated: true, matchedPartName: 'Shock' },
      subtotal: 0,
      deliveryFee: delivery.deliveryFee,
      tierLabel: delivery.tierLabel,
      tierId: delivery.tierId,
      freeDeliveryApplied: delivery.freeDeliveryApplied,
      promisedMinutes: delivery.promisedMinutes,
      deliveryType: delivery.deliveryType,
      vehicleType: delivery.vehicleType,
      breakdown: {
        totalWeightKg: 12,
        tierId: delivery.tierId,
        tierLabel: delivery.tierLabel,
        baseFee: delivery.baseFee,
        deliveryFee: delivery.deliveryFee,
        freeDeliveryApplied: delivery.freeDeliveryApplied,
        vehicleType: delivery.vehicleType,
        deliveryType: delivery.deliveryType,
        promisedMinutes: delivery.promisedMinutes,
      },
    });

    expect(message).toContain('Medium');
    expect(message).toContain('12 kg');
    expect(message).toContain('2,500');
  });
});

describe('totalWeightFromItems', () => {
  it('sums item weights', () => {
    expect(
      totalWeightFromItems([
        { quantity: 2, weightKg: 3 },
        { quantity: 1, weightKg: 1.5 },
      ])
    ).toBe(7.5);
  });
});
