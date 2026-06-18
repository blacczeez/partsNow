import type { SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase/service';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';
import { computeVendorBudget, isVendorPriceOverBudget } from '@/lib/utils/vendor-budget';
import {
  recalculateOrderTotalsFromItems,
  sellingPriceFromVendor,
} from '@/lib/utils/order-repricing';
import { initializePayment } from '@/lib/integrations/paystack';
import {
  notifyPriceChangeRequired,
  notifyPriceChangeAccepted,
  notifyPriceChangeDiscarded,
} from './notifications';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';

type DbClient = SupabaseClient;

async function debitUserWallet(
  supabase: DbClient,
  userId: string,
  amount: number,
  reference: string,
  description: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!wallet) throw new Error('Wallet not found');

  const { data: success, error } = await supabase.rpc('debit_wallet', {
    p_wallet_id: wallet.id,
    p_amount: amount,
    p_reference: reference,
    p_description: description,
    p_metadata: metadata ?? {},
  });

  if (error) throw new Error(error.message);
  if (!success) throw new Error('Insufficient wallet balance');
}

async function creditUserWallet(
  supabase: DbClient,
  userId: string,
  amount: number,
  reference: string,
  description: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!wallet) throw new Error('Wallet not found');

  const { data: success, error } = await supabase.rpc('credit_wallet', {
    p_wallet_id: wallet.id,
    p_amount: amount,
    p_reference: reference,
    p_description: description,
    p_metadata: metadata ?? {},
  });

  if (error) throw new Error(error.message);
  if (!success) throw new Error('Failed to credit wallet');
}

export async function syncOrderPriceReviewStatus(
  supabase: DbClient,
  orderId: string
): Promise<void> {
  const { data: items, error } = await supabase
    .from('order_items')
    .select('price_review_status')
    .eq('order_id', orderId);

  throwIfSupabaseError(error, 'Failed to read order items for price review');

  const rows = items ?? [];
  const hasAdminPending = rows.some((i) => i.price_review_status === 'pending');
  const hasCustomerPending = rows.some((i) => i.price_review_status === 'awaiting_customer');
  const hadReview = rows.some((i) =>
    ['pending', 'awaiting_customer', 'customer_approved', 'rejected'].includes(
      i.price_review_status ?? ''
    )
  );

  let nextStatus: string;
  if (hasAdminPending) nextStatus = 'pending';
  else if (hasCustomerPending) nextStatus = 'awaiting_customer';
  else if (hadReview) nextStatus = 'resolved';
  else nextStatus = 'none';

  const { error: updateError } = await supabase
    .from('orders')
    .update({ price_review_status: nextStatus })
    .eq('id', orderId);

  throwIfSupabaseError(updateError, 'Failed to update order price review status');

  // Sync SLA pause state based on new price review status
  const { syncSlaPauseState } = await import('./sla');
  // Read current clarification status for the combined pause check
  const { data: orderForSla } = await supabase
    .from('orders')
    .select('clarification_status')
    .eq('id', orderId)
    .single();
  syncSlaPauseState(orderId, nextStatus, orderForSla?.clarification_status ?? null).catch(() => {});
}

export interface PriceEscalationResult {
  escalated: boolean;
  expectedVendorPrice: number;
  maxVendorPrice: number;
}

export async function handleVendorPriceEntry(
  supabase: DbClient,
  params: {
    orderId: string;
    itemId: string;
    sellingPrice: number;
    vendorPrice: number;
    vendorId?: string | null;
    description: string;
    actorId?: string;
  }
): Promise<PriceEscalationResult> {
  const budget = computeVendorBudget(params.sellingPrice);
  const escalated = isVendorPriceOverBudget(params.vendorPrice, params.sellingPrice);

  if (!escalated) {
    const { error } = await supabase
      .from('order_items')
      .update({
        price_review_status: null,
        expected_vendor_price: budget.expectedVendorPrice,
        max_vendor_price: budget.maxVendorPrice,
      })
      .eq('id', params.itemId);

    throwIfSupabaseError(error, 'Failed to update order item budgets');
    return { escalated: false, ...budget };
  }

  const note = `[PRICE ESCALATION] ${params.description}: target budget ₦${budget.expectedVendorPrice}, vendor ₦${params.vendorPrice}`;

  const { data: order } = await supabase
    .from('orders')
    .select('internal_notes')
    .eq('id', params.orderId)
    .single();

  const existingNotes = order?.internal_notes || '';
  const updatedNotes = existingNotes.includes(note)
    ? existingNotes
    : existingNotes
      ? `${existingNotes}\n${note}`
      : note;

  const { error: itemError } = await supabase
    .from('order_items')
    .update({
      price_review_status: 'pending',
      expected_vendor_price: budget.expectedVendorPrice,
      max_vendor_price: budget.maxVendorPrice,
    })
    .eq('id', params.itemId);

  throwIfSupabaseError(itemError, 'Failed to flag item for price review');

  const { error: orderError } = await supabase
    .from('orders')
    .update({
      internal_notes: updatedNotes,
      price_review_status: 'pending',
    })
    .eq('id', params.orderId);

  throwIfSupabaseError(orderError, 'Failed to flag order for price review');

  // Pause SLA timer while awaiting admin review
  const { pauseSlaTimer } = await import('./sla');
  pauseSlaTimer(params.orderId).catch(() => {});

  const incidentDescription =
    `Vendor price ₦${params.vendorPrice} exceeds target budget ₦${budget.expectedVendorPrice}. ` +
    `Item: ${params.description}`;

  const { error: incidentError } = await supabase.from('vendor_incidents').insert({
    vendor_id: params.vendorId || null,
    order_id: params.orderId,
    order_item_id: params.itemId,
    type: 'price_discrepancy',
    description: incidentDescription,
  });

  throwIfSupabaseError(incidentError, 'Failed to record price discrepancy incident');

  await writeAuditLog({
    userId: params.actorId ?? null,
    action: AUDIT_ACTIONS.PRICE_REVIEW_ESCALATED,
    entityType: 'order',
    entityId: params.orderId,
    newValues: auditDetails(
      `Price review escalated — vendor ₦${params.vendorPrice} over budget`,
      {
        itemId: params.itemId,
        vendorPrice: params.vendorPrice,
        expectedVendorPrice: budget.expectedVendorPrice,
        description: params.description,
      }
    ),
  });

  return { escalated: true, ...budget };
}

export async function assertNoPendingPriceReview(
  supabase: DbClient,
  orderId: string,
  context: string
): Promise<void> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('price_review_status')
    .eq('id', orderId)
    .single();

  throwIfSupabaseError(orderError, 'Failed to check order price review status');

  if (order?.price_review_status === 'resolved') {
    return;
  }

  if (order?.price_review_status === 'cancelled') {
    throw new Error(`${context}: order was cancelled after price review`);
  }

  if (order?.price_review_status === 'awaiting_customer') {
    throw new Error(`${context}: customer must accept or cancel the updated price`);
  }

  const { data: items, error } = await supabase
    .from('order_items')
    .select('id, description, price_review_status')
    .eq('order_id', orderId)
    .in('price_review_status', ['pending', 'awaiting_customer']);

  throwIfSupabaseError(error, 'Failed to check price review status');

  if (items && items.length > 0) {
    const adminPending = items.filter((i) => i.price_review_status === 'pending');
    if (adminPending.length > 0) {
      const names = adminPending.map((i) => i.description).join(', ');
      throw new Error(
        `${context}: ${adminPending.length} item(s) awaiting admin review (${names})`
      );
    }
    throw new Error(
      `${context}: customer must accept or cancel the updated price before handoff`
    );
  }
}

/** Admin confirms market price is real — notify customer to pay difference or cancel. */
export async function sendPriceChangeToCustomer(
  supabase: DbClient,
  orderId: string,
  itemId: string,
  adminId: string,
  notes?: string
): Promise<{ originalTotal: number; revisedTotal: number; topUpAmount: number }> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('Order not found');

  const { data: item, error: itemError } = await supabase
    .from('order_items')
    .select('*')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .single();

  if (itemError || !item) throw new Error('Order item not found');
  if (item.price_review_status !== 'pending') {
    throw new Error('Item is not pending admin price review');
  }
  if (!item.vendor_price) throw new Error('Item has no vendor price recorded');

  const { data: allItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  throwIfSupabaseError(itemsError, 'Failed to load order items');

  const newSellingPrice = sellingPriceFromVendor(item.vendor_price);
  const itemsForCalc = (allItems ?? []).map((i) =>
    i.id === itemId
      ? { ...i, selling_price: newSellingPrice, price_review_status: 'awaiting_customer' }
      : i
  );

  const repriced = recalculateOrderTotalsFromItems(itemsForCalc, {
    deliveryFee: order.delivery_fee,
    discountAmount: order.discount_amount,
  });

  const originalTotal = order.original_total ?? order.total;
  const topUpAmount = Math.max(0, repriced.total - originalTotal);

  const { error: updateItemError } = await supabase
    .from('order_items')
    .update({
      price_review_status: 'awaiting_customer',
      selling_price: newSellingPrice,
    })
    .eq('id', itemId);

  throwIfSupabaseError(updateItemError, 'Failed to update item for customer review');

  const { error: updateOrderError } = await supabase
    .from('orders')
    .update({
      original_total: originalTotal,
      subtotal: repriced.subtotal,
      markup_amount: repriced.markupAmount,
      total: repriced.total,
      revised_total: repriced.total,
      price_topup_amount: topUpAmount,
      price_review_status: 'awaiting_customer',
      clarification_status: 'price_change_pending',
    })
    .eq('id', orderId);

  throwIfSupabaseError(updateOrderError, 'Failed to update order totals');

  const resolution = notes?.trim()
    ? `Sent to customer by admin ${adminId}: ${notes.trim()}`
    : `Market price confirmed by admin ${adminId} — awaiting customer decision`;

  await supabase
    .from('vendor_incidents')
    .update({ resolution })
    .eq('order_item_id', itemId)
    .eq('type', 'price_discrepancy')
    .is('resolution', null);

  notifyPriceChangeRequired(orderId, originalTotal, repriced.total, topUpAmount).catch(
    () => {}
  );

  await writeAuditLog({
    userId: adminId,
    action: AUDIT_ACTIONS.PRICE_REVIEW_APPROVED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Admin approved market price — sent to customer', {
      itemId,
      originalTotal,
      revisedTotal: repriced.total,
      topUpAmount,
      notes: notes ?? null,
    }),
  });

  return { originalTotal, revisedTotal: repriced.total, topUpAmount };
}

export async function rejectPriceReviewItem(
  supabase: DbClient,
  orderId: string,
  itemId: string,
  adminId: string,
  reason?: string
): Promise<void> {
  const { data: item, error: fetchError } = await supabase
    .from('order_items')
    .select('id, price_review_status')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .single();

  if (fetchError || !item) throw new Error('Order item not found');
  if (item.price_review_status !== 'pending') {
    throw new Error('Item is not pending price review');
  }

  const rejectReason = reason?.trim() || 'Rejected by admin — could not source at market price';

  const { error: itemError } = await supabase
    .from('order_items')
    .update({
      price_review_status: 'rejected',
      is_found: false,
      is_unavailable: true,
      unavailable_reason: rejectReason,
      vendor_price: null,
      qc_image_url: null,
    })
    .eq('id', itemId);

  throwIfSupabaseError(itemError, 'Failed to reject price review item');

  const resolution = `Rejected by admin ${adminId}: ${rejectReason}`;

  await supabase
    .from('vendor_incidents')
    .update({ resolution })
    .eq('order_item_id', itemId)
    .eq('type', 'price_discrepancy')
    .is('resolution', null);

  await syncOrderPriceReviewStatus(supabase, orderId);

  await writeAuditLog({
    userId: adminId,
    action: AUDIT_ACTIONS.PRICE_REVIEW_REJECTED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Admin rejected price review item', {
      itemId,
      reason: rejectReason,
    }),
  });
}

export async function acceptCustomerPriceChange(
  supabase: DbClient,
  customerId: string,
  orderId: string
): Promise<{ paymentUrl?: string }> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (error || !order) throw new Error('Order not found');
  if (order.price_review_status !== 'awaiting_customer') {
    throw new Error('No price update pending on this order');
  }

  const topUp = order.price_topup_amount ?? 0;

  if (topUp > 0) {
    if (order.payment_method === 'wallet') {
      await debitUserWallet(
        supabase,
        customerId,
        topUp,
        orderId,
        `Price adjustment top-up for order ${order.order_number}`,
        {
          kind: 'price_adjustment',
          source: 'price_review',
          order_id: orderId,
          order_number: order.order_number,
        }
      );
    } else if (order.payment_method === 'card') {
      const { data: user } = await supabase
        .from('users')
        .select('email, phone')
        .eq('id', customerId)
        .single();

      const email = user?.email || `${user?.phone}@partsdey.ng`;
      const reference = `price_topup_${orderId}_${Date.now()}`;

      const payment = await initializePayment({
        email,
        amount: topUp,
        reference,
        callbackUrl: `${config.app.url}/order/${orderId}?priceTopup=1`,
        metadata: { type: 'order_price_topup', order_id: orderId },
      });

      return { paymentUrl: payment.authorizationUrl };
    }
    // COD: customer pays higher amount on delivery — no upfront top-up
  }

  await finalizeCustomerPriceAcceptance(supabase, orderId);
  notifyPriceChangeAccepted(orderId).catch(() => {});
  return {};
}

export async function finalizeCustomerPriceAcceptance(
  _supabase: DbClient,
  orderId: string
): Promise<void> {
  // Service role: customers can update orders but not order_items (RLS).
  const db = createServiceClient();

  const { error: itemsError } = await db
    .from('order_items')
    .update({ price_review_status: 'customer_approved' })
    .eq('order_id', orderId)
    .eq('price_review_status', 'awaiting_customer');

  throwIfSupabaseError(itemsError, 'Failed to approve items');

  const { error: orderError } = await db
    .from('orders')
    .update({
      price_review_status: 'resolved',
      price_topup_amount: 0,
      clarification_status: null,
    })
    .eq('id', orderId);

  throwIfSupabaseError(orderError, 'Failed to resolve price review');

  // Resume SLA timer — price review resolved
  const { resumeSlaTimer } = await import('./sla');
  resumeSlaTimer(orderId).catch(() => {});
}

export async function discardCustomerPriceChange(
  supabase: DbClient,
  customerId: string,
  orderId: string
): Promise<void> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (error || !order) throw new Error('Order not found');
  if (order.price_review_status !== 'awaiting_customer') {
    throw new Error('No price update pending on this order');
  }

  const refundAmount = order.original_total ?? order.total;

  if (order.payment_status === 'paid' && order.payment_method !== 'cod') {
    await creditUserWallet(
      supabase,
      customerId,
      refundAmount,
      `refund_price_discard_${orderId}`,
      `Full refund — order ${order.order_number} cancelled after price change`,
      {
        kind: 'refund',
        source: 'price_review',
        order_id: orderId,
        order_number: order.order_number,
      }
    );
  }

  await supabase.from('payment_events').insert({
    order_id: orderId,
    type: 'refund_completed',
    amount: refundAmount,
    provider: order.payment_method === 'wallet' ? 'wallet' : 'wallet',
    status: 'success',
  });

  await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      payment_status:
        order.payment_status === 'paid' ? 'refunded' : order.payment_status,
      price_review_status: 'cancelled',
      clarification_status: null,
      internal_notes: `[PRICE DECLINED] Customer rejected updated price. Full refund ₦${refundAmount}.`,
    })
    .eq('id', orderId);

  await supabase
    .from('order_assignments')
    .update({ status: 'failed' })
    .eq('order_id', orderId)
    .in('status', ['assigned', 'accepted', 'in_progress']);

  notifyPriceChangeDiscarded(orderId, refundAmount).catch(() => {});
}

/** WhatsApp button handler — pay & continue */
export async function acceptPriceChangeFromWhatsApp(
  userId: string,
  orderId: string
): Promise<void> {
  const { createServiceClient } = await import('@/lib/supabase/service');
  const supabase = createServiceClient();
  const result = await acceptCustomerPriceChange(supabase, userId, orderId);
  if (result.paymentUrl) {
    const { sendTextMessage } = await import('@/lib/integrations/wati');
    const { data: user } = await supabase.from('users').select('phone').eq('id', userId).single();
    if (user?.phone) {
      await sendTextMessage(
        user.phone,
        `Complete your additional payment here:\n${result.paymentUrl}`
      );
    }
  }
}

export async function discardPriceChangeFromWhatsApp(
  userId: string,
  orderId: string
): Promise<void> {
  const { createServiceClient } = await import('@/lib/supabase/service');
  const supabase = createServiceClient();
  await discardCustomerPriceChange(supabase, userId, orderId);
}
