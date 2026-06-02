import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdminRiderDetail } from '@/lib/services/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const rider = await getAdminRiderDetail(id);
    return NextResponse.json(rider);
  } catch (error) {
    console.error('Admin rider detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rider details' },
      { status: 500 }
    );
  }
}
