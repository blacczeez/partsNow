import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { User } from '@/lib/types/database';

export async function verifyAdminAuth(): Promise<
  { user: User; error?: never } | { user?: never; error: NextResponse }
> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (userError || !user) {
    return {
      error: NextResponse.json({ error: 'User not found' }, { status: 401 }),
    };
  }

  if (user.user_type !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { user };
}
