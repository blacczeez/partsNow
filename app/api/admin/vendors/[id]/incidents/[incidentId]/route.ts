import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { resolveVendorIncidentSchema } from '@/lib/validators/admin';
import { resolveVendorIncident } from '@/lib/services/vendor-reliability';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; incidentId: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  const { incidentId } = await params;
  const body = await request.json();
  const parsed = resolveVendorIncidentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    await resolveVendorIncident(
      incidentId,
      parsed.data.action,
      auth.user.id,
      parsed.data.resolutionNote
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to resolve incident';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
