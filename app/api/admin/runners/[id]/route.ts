import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdminRunnerDetail } from '@/lib/services/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const runner = await getAdminRunnerDetail(id);
    return NextResponse.json(runner);
  } catch (error) {
    console.error('Admin runner detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch runner details' },
      { status: 500 }
    );
  }
}
