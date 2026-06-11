import { createServiceClient } from '@/lib/supabase/service';

export interface WriteAuditLogInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    const db = createServiceClient();
    await db.from('audit_log').insert({
      user_id: input.userId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      old_values: input.oldValues ?? null,
      new_values: input.newValues ?? null,
    });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}

export function auditDetails(
  summary: string,
  fields?: Record<string, unknown>
): Record<string, unknown> {
  return { summary, ...fields };
}
