import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTransactions } from '@/lib/services/wallet';
import type { WalletTransactionFilter } from '@/lib/utils/wallet-transactions';

const VALID_FILTERS = new Set<WalletTransactionFilter>([
  'all',
  'topups',
  'orders',
  'refunds',
]);

function parseFilter(value: string | null): WalletTransactionFilter {
  if (value && VALID_FILTERS.has(value as WalletTransactionFilter)) {
    return value as WalletTransactionFilter;
  }
  return 'all';
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const filter = parseFilter(searchParams.get('filter'));

  try {
    const { transactions, total, summary } = await getTransactions(
      user.id,
      page,
      limit,
      filter
    );

    return NextResponse.json({
      transactions,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
