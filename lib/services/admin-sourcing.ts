import { createClient } from '@/lib/supabase/server';
import { assignRunner } from '@/lib/services/dispatch';
import { sendTextMessage } from '@/lib/integrations/whatsapp';
import {
  buildSourcingEscalationSummary,
  clearOrderSourcingEscalation,
} from '@/lib/utils/sourcing-escalation';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';

export async function retryRunnerAutoAssign(
  orderId: string,
  adminId?: string
): Promise<{ assigned: boolean }> {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, cluster_id, order_number, status')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('Order not found');
  if (!order.cluster_id) throw new Error('Order has no cluster assigned');
  if (['delivered', 'cancelled', 'failed', 'rejected'].includes(order.status)) {
    throw new Error('Cannot assign runner for a completed order');
  }

  const summary = await buildSourcingEscalationSummary(supabase, order);
  if (summary.allItemsUnavailable) {
    throw new Error('All items are unavailable — cancel the order instead');
  }

  const assignmentId = await assignRunner(orderId, order.cluster_id);
  const assigned = assignmentId !== null;

  if (assigned) {
    await supabase
      .from('orders')
      .update({
        status: 'sourcing',
        sourcing_started_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .in('status', ['confirmed']);

    await clearOrderSourcingEscalation(supabase, orderId);
  }

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.SOURCING_ESCALATION_RETRY_ASSIGN,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Admin retried runner auto-assign', {
      assigned,
      orderNumber: order.order_number,
    }),
  });

  return { assigned };
}

export async function adminMessageCustomerAboutSourcing(
  orderId: string,
  message: string,
  adminId?: string
): Promise<void> {
  const supabase = await createClient();
  const trimmed = message.trim();
  if (!trimmed) throw new Error('Message is required');

  const { data: order, error } = await supabase
    .from('orders')
    .select('order_number, customer_id')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('Order not found');

  const { data: customer } = await supabase
    .from('users')
    .select('phone')
    .eq('id', order.customer_id)
    .single();

  if (!customer?.phone) throw new Error('Customer phone not found');

  await sendTextMessage(
    customer.phone,
    `Update on order ${order.order_number}:\n\n${trimmed}`
  );

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.SOURCING_ESCALATION_CUSTOMER_MESSAGE,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Admin messaged customer about sourcing', {
      orderNumber: order.order_number,
      message: trimmed,
    }),
  });
}

export async function dismissSourcingEscalation(
  orderId: string,
  adminId?: string,
  note?: string
): Promise<void> {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('internal_notes, order_number')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('Order not found');

  const noteLine = note?.trim()
    ? `[Sourcing resolved ${new Date().toISOString()}] ${note.trim()}`
    : `[Sourcing escalation dismissed ${new Date().toISOString()}]`;

  const internalNotes = order.internal_notes
    ? `${order.internal_notes}\n${noteLine}`
    : noteLine;

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      sourcing_escalated_at: null,
      sourcing_escalation_reason: null,
      internal_notes: internalNotes,
    })
    .eq('id', orderId);

  throwIfSupabaseError(updateError, 'Failed to dismiss sourcing escalation');

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.SOURCING_ESCALATION_DISMISSED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Admin dismissed sourcing escalation', {
      orderNumber: order.order_number,
      note: note?.trim() ?? null,
    }),
  });
}
