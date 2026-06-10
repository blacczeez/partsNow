import { NextRequest, NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { markItemFound } from '@/lib/services/runner';
import { markItemFoundSchema } from '@/lib/validators/runner';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  const { id, itemId } = await params;
  const body = await request.json();
  const parsed = markItemFoundSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const markResult = await markItemFound(auth.user.id, id, itemId, parsed.data);
    return NextResponse.json({
      success: true,
      priceReviewPending: markResult.escalated,
      targetVendorPrice: markResult.expectedVendorPrice,
      expectedVendorPrice: markResult.expectedVendorPrice,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark item as found';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
