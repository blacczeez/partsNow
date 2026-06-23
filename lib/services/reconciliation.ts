import { createClient } from '@/lib/supabase/server';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';

export async function reconcileRunnerShift(
  shiftId: string,
  adminId: string,
  note?: string
): Promise<void> {
  const supabase = await createClient();

  const { data: shift, error } = await supabase
    .from('runner_shifts')
    .select(
      'id, runner_id, ended_at, is_reconciled, discrepancy_amount, discrepancy_notes'
    )
    .eq('id', shiftId)
    .single();

  if (error || !shift) throw new Error('Shift not found');
  if (!shift.ended_at) throw new Error('Cannot reconcile an active shift');
  if (shift.is_reconciled) return;

  const trimmedNote = note?.trim();
  const internalNotes = trimmedNote
    ? shift.discrepancy_notes
      ? `${shift.discrepancy_notes}\n[Reconciled] ${trimmedNote}`
      : `[Reconciled] ${trimmedNote}`
    : shift.discrepancy_notes;

  const { data: updated, error: updateError } = await supabase
    .from('runner_shifts')
    .update({
      is_reconciled: true,
      reconciled_at: new Date().toISOString(),
      reconciled_by: adminId,
      discrepancy_notes: internalNotes,
    })
    .eq('id', shiftId)
    .select('id, is_reconciled')
    .single();

  throwIfSupabaseError(updateError, 'Failed to reconcile shift');

  if (!updated?.is_reconciled) {
    throw new Error(
      'Failed to reconcile shift: update was blocked (check admin permissions)'
    );
  }

  await writeAuditLog({
    userId: adminId,
    action: AUDIT_ACTIONS.RUNNER_SHIFT_RECONCILED,
    entityType: 'user',
    entityId: shift.runner_id,
    newValues: auditDetails('Admin reconciled runner shift', {
      shiftId,
      discrepancyAmount: shift.discrepancy_amount,
      note: trimmedNote ?? null,
    }),
  });
}
