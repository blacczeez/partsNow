import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWalletBalance } from '@/lib/services/wallet';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const balance = await getWalletBalance(user.id);

    if (!balance) {
      return NextResponse.json(
        { balance: 0, heldBalance: 0, currency: 'NGN' }
      );
    }

    return NextResponse.json(balance);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch balance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
