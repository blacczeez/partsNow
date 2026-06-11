import { createServiceClient } from '@/lib/supabase/service';
import { getDeliveryPricingConfig } from '@/lib/services/delivery-config';
import {
  calculateDeliveryFee,
  computeTotalWeightKg,
  toDeliveryFeeBreakdown,
} from '@/lib/utils/delivery-pricing';
import { formatCurrency } from '@/lib/utils/format';
import type { DeliveryFeeBreakdown } from '@/lib/types/delivery';

/** Conservative default when catalogue match has no weight (light tier estimate). */
export const WHATSAPP_DEFAULT_ESTIMATE_KG = 3;

export interface WhatsAppWeightEstimate {
  totalWeightKg: number;
  estimated: boolean;
  matchedPartName: string | null;
}

export interface WhatsAppDeliveryQuote {
  weight: WhatsAppWeightEstimate;
  subtotal: number;
  deliveryFee: number;
  tierLabel: string;
  tierId: string;
  freeDeliveryApplied: boolean;
  promisedMinutes: number;
  deliveryType: 'express' | 'standard';
  vehicleType: string;
  breakdown: DeliveryFeeBreakdown;
}

export async function estimateWhatsAppOrderWeight(
  description: string
): Promise<WhatsAppWeightEstimate> {
  const supabase = createServiceClient();
  const query = description.trim().slice(0, 120);

  const { data: parts } = await supabase
    .from('parts')
    .select('name, weight_kg')
    .eq('is_active', true)
    .not('weight_kg', 'is', null)
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(5);

  const matches = (parts ?? []) as Array<{ name: string; weight_kg: number }>;

  if (matches.length === 0) {
    const tokens = query
      .split(/[,;+]|\band\b/i)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);

    for (const token of tokens.slice(0, 3)) {
      const { data: tokenParts } = await supabase
        .from('parts')
        .select('name, weight_kg')
        .eq('is_active', true)
        .not('weight_kg', 'is', null)
        .ilike('name', `%${token}%`)
        .order('name')
        .limit(1);

      const hit = (tokenParts ?? [])[0] as { name: string; weight_kg: number } | undefined;
      if (hit) {
        return {
          totalWeightKg: hit.weight_kg,
          estimated: true,
          matchedPartName: hit.name,
        };
      }
    }

    return {
      totalWeightKg: WHATSAPP_DEFAULT_ESTIMATE_KG,
      estimated: true,
      matchedPartName: null,
    };
  }

  const best = matches.reduce((a, b) => (a.weight_kg >= b.weight_kg ? a : b));
  return {
    totalWeightKg: best.weight_kg,
    estimated: true,
    matchedPartName: best.name,
  };
}

export async function buildWhatsAppDeliveryQuote(
  description: string,
  subtotal = 0
): Promise<WhatsAppDeliveryQuote> {
  const weight = await estimateWhatsAppOrderWeight(description);
  const deliveryConfig = await getDeliveryPricingConfig();
  const delivery = calculateDeliveryFee(subtotal, weight.totalWeightKg, deliveryConfig);
  const breakdown = toDeliveryFeeBreakdown(delivery);

  return {
    weight,
    subtotal,
    deliveryFee: delivery.deliveryFee,
    tierLabel: delivery.tierLabel,
    tierId: delivery.tierId,
    freeDeliveryApplied: delivery.freeDeliveryApplied,
    promisedMinutes: delivery.promisedMinutes,
    deliveryType: delivery.deliveryType,
    vehicleType: delivery.vehicleType,
    breakdown,
  };
}

export function formatWhatsAppDeliveryQuoteMessage(
  description: string,
  quote: WhatsAppDeliveryQuote
): string {
  const weightNote = quote.weight.matchedPartName
    ? `Est. weight: ~${quote.weight.totalWeightKg} kg (based on ${quote.weight.matchedPartName})`
    : `Est. weight: ~${quote.weight.totalWeightKg} kg`;

  const feeLine = quote.freeDeliveryApplied
    ? 'Delivery: FREE (order value qualifies)'
    : `Delivery: ${formatCurrency(quote.deliveryFee)} (${quote.tierLabel} tier)`;

  const partsNote =
    quote.subtotal > 0
      ? `Parts: ${formatCurrency(quote.subtotal)} (estimate)\n`
      : 'Parts price: confirmed after sourcing\n';

  return (
    `Quote for: ${description}\n\n` +
    `${partsNote}` +
    `${weightNote}\n` +
    `${feeLine}\n` +
    `ETA: ~${quote.promisedMinutes} mins (${quote.deliveryType})\n\n` +
    `Final delivery fee may adjust if actual weight differs after sourcing.`
  );
}

export function whatsAppOrderWeightItems(
  items: Array<{ quantity: number; weightKg?: number | null }>
): Array<{ weight_kg: number; quantity: number }> {
  const withWeight = items.filter((i) => i.weightKg != null && i.weightKg > 0);
  if (withWeight.length === 0) {
    return [{ weight_kg: WHATSAPP_DEFAULT_ESTIMATE_KG, quantity: 1 }];
  }
  return withWeight.map((i) => ({
    weight_kg: i.weightKg as number,
    quantity: i.quantity,
  }));
}

export function totalWeightFromItems(
  items: Array<{ quantity: number; weightKg?: number | null }>
): number {
  return computeTotalWeightKg(whatsAppOrderWeightItems(items));
}
