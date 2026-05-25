import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initiateTopUp } from '@/lib/services/wallet';
import { topUpSchema } from '@/lib/validators/wallet';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = topUpSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.format() },
      { status: 400 }
    );
  }

  try {
    const { authorizationUrl, reference } = await initiateTopUp(
      user.id,
      result.data.amount
    );

    return NextResponse.json({ authorizationUrl, reference });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Top-up failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
