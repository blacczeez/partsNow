import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { resolvePriceReview } from '@/lib/services/admin';
import { priceReviewActionSchema } from '@/lib/validators/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const parsed = priceReviewActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await resolvePriceReview(
      auth.user.id,
      orderId,
      parsed.data.itemId,
      parsed.data.action,
      parsed.data.notes
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Price review action error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to resolve price review';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
