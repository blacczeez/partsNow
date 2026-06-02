import { NextRequest, NextResponse } from 'next/server';
import { verifyRiderAuth } from '@/lib/utils/rider-auth';
import { confirmDelivery } from '@/lib/services/rider';
import { confirmDeliverySchema } from '@/lib/validators/rider';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRiderAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = confirmDeliverySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await confirmDelivery(auth.user.id, id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to confirm delivery';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
