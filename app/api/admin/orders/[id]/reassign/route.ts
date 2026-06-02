import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { reassignOrder } from '@/lib/services/admin';
import { reassignOrderSchema } from '@/lib/validators/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = reassignOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const assignment = await reassignOrder(
      id,
      result.data.role,
      result.data.assigneeId
    );
    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Reassign order error:', error);
    return NextResponse.json(
      { error: 'Failed to reassign order' },
      { status: 500 }
    );
  }
}
