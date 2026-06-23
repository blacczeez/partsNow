import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { reconcileRunnerShift } from '@/lib/services/reconciliation';
import { reconcileShiftSchema } from '@/lib/validators/reconciliation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = reconcileShiftSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    await reconcileRunnerShift(id, auth.user.id, result.data.note);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reconcile shift error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to reconcile shift';
    const status =
      message.includes('not found') || message.includes('Cannot reconcile')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
