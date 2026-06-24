import { createClient } from '@/lib/supabase/server';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';
import {
  VENDOR_INCIDENT_SOURCES,
  VENDOR_INCIDENT_STATUSES,
  VENDOR_INCIDENT_TYPES,
  type PartIssueSubtype,
} from '@/lib/constants/vendor-incidents';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
import { recalculateVendorsForOrder } from '@/lib/services/vendor-reliability';
import { notifyAdminVendorIncident } from '@/lib/services/notifications';

export interface ReportPartIssueInput {
  itemId: string;
  issueSubtype: PartIssueSubtype;
  notes?: string;
  photoUrl?: string;
}

export async function reportCustomerPartIssues(
  customerId: string,
  orderId: string,
  reports: ReportPartIssueInput[]
): Promise<{ reportedCount: number }> {
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, status, customer_id')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (orderError || !order) throw new Error('Order not found');
  if (order.status !== 'delivered') {
    throw new Error('Part issues can only be reported on delivered orders');
  }

  const itemIds = reports.map((r) => r.itemId);
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id, description, vendor_id, is_found, part_issue_reported')
    .eq('order_id', orderId)
    .in('id', itemIds);

  throwIfSupabaseError(itemsError, 'Failed to load order items');

  const itemMap = new Map((items ?? []).map((item) => [item.id, item]));
  let reportedCount = 0;

  for (const report of reports) {
    const item = itemMap.get(report.itemId);
    if (!item) throw new Error('Order item not found');
    if (!item.is_found) throw new Error('Can only report issues on sourced parts');
    if (item.part_issue_reported) {
      throw new Error(`Issue already reported for ${item.description}`);
    }

    const description = [
      `Customer report: ${report.issueSubtype.replace(/_/g, ' ')}`,
      `Item: ${item.description}`,
      report.notes?.trim() ? `Notes: ${report.notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join('. ');

    const { error: incidentError } = await supabase.from('vendor_incidents').insert({
      vendor_id: item.vendor_id,
      order_id: orderId,
      order_item_id: item.id,
      type: VENDOR_INCIDENT_TYPES.QUALITY_ISSUE,
      issue_subtype: report.issueSubtype,
      status: VENDOR_INCIDENT_STATUSES.PENDING,
      source: VENDOR_INCIDENT_SOURCES.CUSTOMER,
      reported_by: customerId,
      description,
      photo_url: report.photoUrl ?? null,
    });

    throwIfSupabaseError(incidentError, 'Failed to submit part issue report');

    const { error: flagError } = await supabase
      .from('order_items')
      .update({ part_issue_reported: true })
      .eq('id', item.id);

    throwIfSupabaseError(flagError, 'Failed to update item report status');
    reportedCount++;
  }

  await writeAuditLog({
    userId: customerId,
    action: AUDIT_ACTIONS.CUSTOMER_PART_ISSUE_REPORTED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Customer reported part quality issues', {
      orderNumber: order.order_number,
      reportedCount,
      itemIds,
    }),
  });

  notifyAdminVendorIncident(orderId, reportedCount).catch(() => {});

  return { reportedCount };
}

export async function applyRatingReliabilityCredits(orderId: string): Promise<void> {
  await recalculateVendorsForOrder(orderId);
}
