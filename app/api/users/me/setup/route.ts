import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUserProfile, getUserProfile } from '@/lib/services/users';
import { setupProfileSchema } from '@/lib/validators/user';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if profile already exists
  const existing = await getUserProfile(authUser.id);
  if (existing) {
    return NextResponse.json(
      { error: 'Profile already exists' },
      { status: 409 }
    );
  }

  const body = await request.json();
  const result = setupProfileSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.format() },
      { status: 400 }
    );
  }

  try {
    const user = await createUserProfile({
      id: authUser.id,
      phone: authUser.phone || '',
      full_name: result.data.full_name,
      email: result.data.email || undefined,
      delivery_address: result.data.delivery_address,
    });

    if (result.data.add_vehicle && result.data.vehicle) {
      const { error: vehicleError } = await supabase.from('vehicles').insert({
        user_id: authUser.id,
        make: result.data.vehicle.make,
        model: result.data.vehicle.model,
        year: result.data.vehicle.year,
        spec: result.data.vehicle.spec || null,
        nickname: result.data.vehicle.nickname || null,
        is_primary: true,
      });

      if (vehicleError) {
        return NextResponse.json(
          { error: 'Profile created but vehicle could not be saved' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Setup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
