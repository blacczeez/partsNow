import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdminOrders } from '@/lib/services/admin';
import {
  ATTENTION_TYPES,
  type AttentionType,
} from '@/lib/constants/admin-attention';
import type { OrderStatus } from '@/lib/types/database';

function parseAttentionParam(value: string | null): AttentionType | undefined {
  if (!value) return undefined;
  return ATTENTION_TYPES.includes(value as AttentionType)
    ? (value as AttentionType)
    : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const attention = parseAttentionParam(searchParams.get('attention'));
    const status = searchParams.get('status') as OrderStatus | null;
    const search = searchParams.get('search') || undefined;
    const priceReviewPending =
      !attention && searchParams.get('priceReview') === 'pending';

    const result = await getAdminOrders({
      page,
      limit,
      attention,
      status: attention ? undefined : status || undefined,
      search: attention ? undefined : search,
      priceReviewPending: priceReviewPending || undefined,
    });

    return NextResponse.json({
      orders: result.orders,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
