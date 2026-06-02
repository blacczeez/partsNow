import { NextRequest, NextResponse } from 'next/server';
import { verifyRiderAuth } from '@/lib/utils/rider-auth';
import { getRiderHistory } from '@/lib/services/rider';

export async function GET(request: NextRequest) {
  const auth = await verifyRiderAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const { deliveries, total } = await getRiderHistory(auth.user.id, page, limit);
    return NextResponse.json({
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch delivery history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
