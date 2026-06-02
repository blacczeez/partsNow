import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { adminCancelOrder } from '@/lib/services/admin';
import { adminCancelOrderSchema } from '@/lib/validators/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = adminCancelOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    await adminCancelOrder(id, result.data.reason);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel order error:', error);
    const message = error instanceof Error ? error.message : 'Failed to cancel order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
