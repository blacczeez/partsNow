import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAndCreditTopUp } from '@/lib/services/wallet';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const reference = body.reference;

  if (!reference || typeof reference !== 'string') {
    return NextResponse.json(
      { error: 'Reference is required' },
      { status: 400 }
    );
  }

  try {
    const result = await verifyAndCreditTopUp(user.id, reference);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      amount: result.amount,
      newBalance: result.newBalance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
