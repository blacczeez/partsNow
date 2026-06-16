import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getSystemConfig, updateSystemConfig } from '@/lib/services/admin';
import { getEffectiveAdminSettings } from '@/lib/services/runtime-config';
import { ADMIN_SETTINGS_GROUPS } from '@/lib/constants/admin-settings';
import { updateConfigSchema } from '@/lib/validators/admin';

export async function GET() {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const [rawConfig, effectiveSettings] = await Promise.all([
      getSystemConfig(),
      getEffectiveAdminSettings(),
    ]);

    const effectiveByKey = Object.fromEntries(
      effectiveSettings.map((setting) => [setting.key, setting])
    );

    return NextResponse.json({
      groups: ADMIN_SETTINGS_GROUPS,
      settings: effectiveSettings,
      effectiveByKey,
      rawConfig,
    });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = updateConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateSystemConfig(
      result.data.key,
      result.data.value,
      auth.user.id
    );
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
