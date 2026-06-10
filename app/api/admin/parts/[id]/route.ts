import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { updatePart } from '@/lib/services/admin';
import { updatePartSchema } from '@/lib/validators/admin';
import { uuidIdSchema } from '@/lib/utils/validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;

    const idResult = uuidIdSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: 'Invalid part ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = updatePartSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const part = await updatePart(id, result.data);
    return NextResponse.json(part);
  } catch (error) {
    console.error('Update part error:', error);
    return NextResponse.json(
      { error: 'Failed to update part' },
      { status: 500 }
    );
  }
}
