import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { topUpRunnerFloat } from '@/lib/services/admin';
import { topUpFloatSchema } from '@/lib/validators/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = topUpFloatSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const topUp = await topUpRunnerFloat(id, result.data.amount);
    return NextResponse.json(topUp);
  } catch (error) {
    console.error('Float top-up error:', error);
    return NextResponse.json(
      { error: 'Failed to top up float' },
      { status: 500 }
    );
  }
}
