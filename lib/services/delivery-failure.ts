import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { config } from '@/lib/config';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';
import {
  DELIVERY_RESOLUTION,
  PARTS_CUSTODY,
  formatDeliveryFailureReason,
  requiresFailurePhoto,
  type DeliveryFailureReason,
} from '@/lib/constants/delivery-failure';
import { initiateDeliverySettlement } from './delivery-settlement';
import {
  notifyDeliveryAttempt,
  notifyDeliveryFailed,
  notifyAdminDeliveryEscalation,
} from './notifications';

export interface ReportDeliveryFailureInput {
  reason: DeliveryFailureReason;
  notes?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  callAttemptsMade?: number;
}

const ATTEMPT_STATUS_MAP: Record<DeliveryFailureReason, string> = {
  customer_unavailable: 'failed_no_answer',
  customer_refused: 'failed_customer_refused',
  wrong_address: 'failed_wrong_address',
  other: 'failed_no_answer',
};

async function appendOrderNote(orderId: string, line: string): Promise<void> {
  const db = createServiceClient();
  const { data: order } = await db
    .from('orders')
    .select('internal_notes')
    .eq('id', orderId)
    .single();

  const existing = (order?.internal_notes as string | null) ?? '';
  const stamp = new Date().toISOString();
  const next = existing ? `${existing}\n[${stamp}] ${line}` : `[${stamp}] ${line}`;

  await db.from('orders').update({ internal_notes: next }).eq('id', orderId);
}

async function writeAuditLog(
  riderId: string,
  orderId: string,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  const db = createServiceClient();
  await db.from('audit_log').insert({
    user_id: riderId,
    action,
    entity_type: 'order',
    entity_id: orderId,
    new_values: details,
  });
}

async function clearDeliveryTracking(orderId: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from('delivery_tracking')
    .update({
      current_latitude: null,
      current_longitude: null,
      eta_minutes: null,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId);
}

async function recordCodRefusal(customerId: string): Promise<void> {
  const db = createServiceClient();
  const { data: user } = await db
    .from('users')
    .select('profile')
    .eq('id', customerId)
    .single();

  if (!user) return;

  const profile = (user.profile as Record<string, unknown>) ?? {};
  const count = ((profile.cod_refusal_count as number) ?? 0) + 1;
  const nextProfile: Record<string, unknown> = {
    ...profile,
    cod_refusal_count: count,
  };

  if (count >= config.payments.codRefusalLimitBeforeDisable) {
    nextProfile.cod_disabled = true;
  }

  await db.from('users').update({ profile: nextProfile }).eq('id', customerId);
}

async function finalizeTerminalDeliveryFailure(
  orderId: string,
  riderId: string,
  terminalStatus: 'failed' | 'rejected',
  reason: DeliveryFailureReason,
  notes?: string
): Promise<void> {
  const db = createServiceClient();
  const label = formatDeliveryFailureReason(reason);

  const { data: order, error: fetchError } = await db
    .from('orders')
    .select(
      'id, status, customer_id, payment_method, payment_status, order_number, total'
    )
    .eq('id', orderId)
    .single();

  if (fetchError || !order) throw new Error('Order not found');

  if (order.status !== 'dispatched') {
    throw new Error('Order is not in delivery — cannot finalize failure');
  }

  const { error: orderError } = await db
    .from('orders')
    .update({
      status: terminalStatus,
      delivery_resolution: DELIVERY_RESOLUTION.RETURN_PENDING,
      parts_custody: PARTS_CUSTODY.WITH_RIDER,
      delivery_retry_after: null,
    })
    .eq('id', orderId)
    .eq('status', 'dispatched');

  throwIfSupabaseError(orderError, 'Failed to update order status');

  await clearDeliveryTracking(orderId);

  const noteLine = `Rider reported: ${label}${notes ? ` — ${notes}` : ''}. Status → ${terminalStatus}.`;
  await appendOrderNote(orderId, noteLine);

  await writeAuditLog(riderId, orderId, 'delivery_failure_terminal', {
    terminalStatus,
    reason,
    notes: notes ?? null,
  });

  if (reason === 'customer_refused' && order.payment_method === 'cod') {
    await recordCodRefusal(order.customer_id);
  }

  await initiateDeliverySettlement(orderId, 'customer', reason);

  notifyDeliveryFailed(orderId, label, terminalStatus).catch(() => {});
}

export async function reportDeliveryFailure(
  riderId: string,
  orderId: string,
  data: ReportDeliveryFailureInput
): Promise<{ outcome: 'retry' | 'admin_review' | 'terminal' }> {
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('id, status')
    .eq('assignee_id', riderId)
    .eq('order_id', orderId)
    .eq('role', 'rider')
    .eq('status', 'in_progress')
    .single();

  if (!assignment) {
    throw new Error('Pickup must be confirmed before reporting a delivery issue');
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, status, total, delivery_retry_after, payment_method, customer_id'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('Order not found');

  if (order.status !== 'dispatched') {
    throw new Error('Delivery issues can only be reported while order is out for delivery');
  }

  if (order.delivery_retry_after) {
    const retryAfter = new Date(order.delivery_retry_after);
    if (retryAfter > new Date()) {
      const mins = Math.ceil((retryAfter.getTime() - Date.now()) / 60000);
      throw new Error(
        `Please wait ${mins} minute(s) before reporting another delivery attempt`
      );
    }
  }

  const isHighValue = order.total >= config.dispatch.highValueThreshold;
  if (
    requiresFailurePhoto(
      data.reason,
      isHighValue,
      config.dispatch.highValueRequiresPhoto
    ) &&
    !data.photoUrl
  ) {
    throw new Error('Photo evidence is required for this failure reason');
  }

  if (data.reason === 'customer_unavailable') {
    const calls = data.callAttemptsMade ?? 0;
    if (calls < 1) {
      throw new Error('Log at least one call attempt to the customer before reporting unavailable');
    }
  }

  const { count } = await supabase
    .from('delivery_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId);

  const attemptNumber = (count ?? 0) + 1;

  const { error: failureAttemptError } = await supabase.from('delivery_attempts').insert({
    order_id: orderId,
    rider_id: riderId,
    attempt_number: attemptNumber,
    status: ATTEMPT_STATUS_MAP[data.reason],
    failure_reason: data.reason,
    notes: data.notes || null,
    photo_url: data.photoUrl || null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    call_attempts_made: data.callAttemptsMade ?? 0,
  });
  throwIfSupabaseError(failureAttemptError, 'Failed to record delivery failure');

  const label = formatDeliveryFailureReason(data.reason);
  await appendOrderNote(
    orderId,
    `Attempt #${attemptNumber}: ${label}${data.notes ? ` — ${data.notes}` : ''}`
  );

  if (data.reason === 'customer_refused') {
    const { error: rejectAssignmentError } = await supabase
      .from('order_assignments')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', assignment.id);
    throwIfSupabaseError(rejectAssignmentError, 'Failed to update assignment');

    await finalizeTerminalDeliveryFailure(
      orderId,
      riderId,
      'rejected',
      data.reason,
      data.notes
    );
    return { outcome: 'terminal' };
  }

  if (
    data.reason === 'wrong_address' ||
    data.reason === 'other'
  ) {
    const db = createServiceClient();

    const { error: failAssignmentError } = await supabase
      .from('order_assignments')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', assignment.id);
    throwIfSupabaseError(failAssignmentError, 'Failed to update assignment');

    const { error: escalateError } = await db
      .from('orders')
      .update({
        delivery_resolution: DELIVERY_RESOLUTION.ADMIN_REVIEW,
        parts_custody: PARTS_CUSTODY.WITH_RIDER,
        delivery_retry_after: null,
      })
      .eq('id', orderId)
      .eq('status', 'dispatched');
    throwIfSupabaseError(escalateError, 'Failed to escalate for admin review');

    await clearDeliveryTracking(orderId);
    await writeAuditLog(riderId, orderId, 'delivery_failure_admin_review', {
      reason: data.reason,
      notes: data.notes ?? null,
    });

    notifyAdminDeliveryEscalation(orderId, label, data.notes).catch(() => {});
    notifyDeliveryFailed(orderId, label, 'admin_review').catch(() => {});

    return { outcome: 'admin_review' };
  }

  // customer_unavailable
  if (attemptNumber < config.dispatch.riderMaxCallAttempts) {
    const db = createServiceClient();
    const retryAfter = new Date(
      Date.now() + config.dispatch.riderWaitTimeMinutes * 60 * 1000
    ).toISOString();

    const { error: retryError } = await db
      .from('orders')
      .update({
        delivery_resolution: DELIVERY_RESOLUTION.RETRY,
        delivery_retry_after: retryAfter,
        parts_custody: PARTS_CUSTODY.WITH_RIDER,
      })
      .eq('id', orderId);
    throwIfSupabaseError(retryError, 'Failed to schedule delivery retry');

    notifyDeliveryAttempt(orderId, attemptNumber, label).catch(() => {});
    return { outcome: 'retry' };
  }

  const { error: failAssignmentError } = await supabase
    .from('order_assignments')
    .update({ status: 'failed', completed_at: new Date().toISOString() })
    .eq('id', assignment.id);
  throwIfSupabaseError(failAssignmentError, 'Failed to update assignment');

  await finalizeTerminalDeliveryFailure(
    orderId,
    riderId,
    'failed',
    data.reason,
    data.notes
  );
  return { outcome: 'terminal' };
}

/** Admin marks parts returned to hub after a failed delivery. */
export async function markPartsReturnedToHub(
  orderId: string,
  partsRecoveryRate?: number
): Promise<void> {
  const db = createServiceClient();

  const { data: order } = await db
    .from('orders')
    .select('id, status, parts_custody, delivery_resolution, settlement_status')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Order not found');

  if (order.parts_custody === PARTS_CUSTODY.AT_HUB) {
    const { onPartsReturnedForSettlement } = await import('./delivery-settlement');
    await onPartsReturnedForSettlement(orderId, partsRecoveryRate);
    return;
  }

  const { canConfirmPartsAtHub } = await import('@/lib/constants/delivery-failure');
  if (!canConfirmPartsAtHub(order.parts_custody, order.status)) {
    throw new Error(
      order.parts_custody
        ? `Cannot mark at hub: parts custody is "${order.parts_custody}"`
        : 'Parts custody was never recorded. Only failed or rejected deliveries can be marked at hub.'
    );
  }

  const { error } = await db
    .from('orders')
    .update({
      parts_custody: PARTS_CUSTODY.AT_HUB,
      delivery_resolution:
        order.delivery_resolution === DELIVERY_RESOLUTION.RETURN_PENDING
          ? null
          : order.delivery_resolution,
    })
    .eq('id', orderId);

  throwIfSupabaseError(error, 'Failed to mark parts returned');
  await appendOrderNote(orderId, 'Parts returned to hub (admin confirmed).');

  const { onPartsReturnedForSettlement } = await import('./delivery-settlement');
  try {
    await onPartsReturnedForSettlement(orderId, partsRecoveryRate);
  } catch (err) {
    console.error('Settlement after parts return failed:', err);
    throw err instanceof Error
      ? err
      : new Error('Parts marked at hub but settlement failed — use Execute settlement');
  }
}

/** Clear admin review after ops resolves (reassign rider / update address). */
export async function clearDeliveryEscalation(orderId: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from('orders')
    .update({
      delivery_resolution: null,
      delivery_retry_after: null,
    })
    .eq('id', orderId);
}
