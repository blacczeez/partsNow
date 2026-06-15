import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { updateAdminCustomerLoyalty } from '@/lib/services/admin';

const updateLoyaltySchema = z.object({
  loyaltyTier: z.enum(['new', 'verified', 'trusted', 'partner']),
  lockTier: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateLoyaltySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await updateAdminCustomerLoyalty(auth.user.id, id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
