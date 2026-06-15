import { NextRequest, NextResponse } from 'next/server';
import { verifyRiderAuth } from '@/lib/utils/rider-auth';
import { rejectRiderDelivery } from '@/lib/services/rider';
import { rejectRiderDeliverySchema } from '@/lib/validators/rider';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRiderAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const result = rejectRiderDeliverySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.format() },
      { status: 400 }
    );
  }

  try {
    await rejectRiderDelivery(auth.user.id, id, result.data.reason);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to decline delivery';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
