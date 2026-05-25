import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile, updateUserProfile } from '@/lib/services/users';
import { updateProfileSchema } from '@/lib/validators/user';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await getUserProfile(authUser.id);

  if (!profile) {
    return NextResponse.json({
      needsSetup: true,
      phone: authUser.phone,
    });
  }

  return NextResponse.json({
    needsSetup: false,
    user: profile,
    wallet: profile.wallet,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = updateProfileSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.format() },
      { status: 400 }
    );
  }

  try {
    const user = await updateUserProfile(authUser.id, {
      full_name: result.data.full_name,
      email: result.data.email || undefined,
      profile: result.data.profile,
    });

    return NextResponse.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
