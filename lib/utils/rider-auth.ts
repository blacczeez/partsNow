import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@/lib/types/database';

export async function verifyRiderAuth(): Promise<
  | { user: User; error?: never }
  | { user?: never; error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (!user || user.user_type !== 'rider') {
    return {
      error: NextResponse.json({ error: 'Not authorized as rider' }, { status: 403 }),
    };
  }

  return { user: user as User };
}
