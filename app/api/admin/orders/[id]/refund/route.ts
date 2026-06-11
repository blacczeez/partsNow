import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { processRefund } from '@/lib/services/admin';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await processRefund(id, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Refund error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process refund';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
