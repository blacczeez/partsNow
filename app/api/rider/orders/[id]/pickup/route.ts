import { NextRequest, NextResponse } from 'next/server';
import { verifyRiderAuth } from '@/lib/utils/rider-auth';
import { confirmPickup } from '@/lib/services/rider';
import { confirmPickupSchema } from '@/lib/validators/rider';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRiderAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = confirmPickupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await confirmPickup(auth.user.id, id, parsed.data.pickupPhotoUrl);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to confirm pickup';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
