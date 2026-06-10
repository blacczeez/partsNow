import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import {
  updateSettlementDraft,
  executeDeliverySettlement,
} from '@/lib/services/delivery-settlement';
import { calculateDeliverySettlement } from '@/lib/utils/delivery-settlement';
import { createServiceClient } from '@/lib/supabase/service';

const updateSchema = z.object({
  action: z.enum(['preview', 'update', 'execute']),
  fault: z.enum(['customer', 'platform', 'waived']).optional(),
  /** Parts recovery 0–100 (percent returned from vendor) */
  partsRecoveryPercent: z.number().min(0).max(100).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, fault, partsRecoveryPercent } = parsed.data;
    const partsRecoveryRate =
      partsRecoveryPercent !== undefined ? partsRecoveryPercent / 100 : undefined;

    if (action === 'execute') {
      const breakdown = await executeDeliverySettlement(id);
      return NextResponse.json({ success: true, breakdown });
    }

    if (action === 'update' || action === 'preview') {
      const breakdown = await updateSettlementDraft(id, {
        fault,
        partsRecoveryRate,
      });
      return NextResponse.json({ breakdown });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Settlement failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const db = createServiceClient();

  const { data: order, error } = await db
    .from('orders')
    .select(
      'subtotal, markup_amount, delivery_fee, discount_amount, total, revised_total, settlement_status, settlement_fault, parts_recovery_rate, parts_custody, return_handling_fee, settlement_refund_amount, settlement_breakdown, settlement_completed_at'
    )
    .eq('id', id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const fault = (order.settlement_fault ?? 'customer') as 'customer' | 'platform' | 'waived';
  const breakdown = calculateDeliverySettlement({
    order,
    fault,
    partsRecoveryRate: order.parts_recovery_rate ?? 0,
  });

  return NextResponse.json({ order, breakdown });
}
