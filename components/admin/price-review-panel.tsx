'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import {
  customerLineTotal,
  listedLineTotal,
  partPricingFromVendorUnit,
  quotedServiceFeeLine,
} from '@/lib/utils/order-pricing-display';
import { recalculateOrderTotalsFromItems, sellingPriceFromVendor } from '@/lib/utils/order-repricing';

interface PriceReviewItem {
  id: string;
  description: string;
  quantity: number;
  selling_price: number;
  vendor_price: number | null;
  expected_vendor_price: number | null;
  max_vendor_price: number | null;
  price_review_status: string | null;
  is_found: boolean;
  is_unavailable: boolean;
}

interface PriceReviewPanelProps {
  items: PriceReviewItem[];
  deliveryFee: number;
  discountAmount: number;
  orderTotal: number;
  actionLoading: boolean;
  onSendToCustomer: (itemId: string) => void;
  onReject: (itemId: string) => void;
}

function estimateCustomerTopUp(
  allItems: PriceReviewItem[],
  changedItemId: string,
  vendorUnitPrice: number,
  deliveryFee: number,
  discountAmount: number,
  orderTotal: number
): number {
  const newSellingUnit = sellingPriceFromVendor(vendorUnitPrice);
  const repriced = recalculateOrderTotalsFromItems(
    allItems.map((i) =>
      i.id === changedItemId
        ? {
            quantity: i.quantity,
            vendor_price: vendorUnitPrice,
            selling_price: newSellingUnit,
            is_found: true,
            is_unavailable: false,
          }
        : {
            quantity: i.quantity,
            vendor_price: i.vendor_price,
            selling_price: i.selling_price,
            is_found: i.is_found,
            is_unavailable: i.is_unavailable,
          }
    ),
    { deliveryFee, discountAmount }
  );
  return Math.max(0, repriced.total - orderTotal);
}

export function PriceReviewPanel({
  items,
  deliveryFee,
  discountAmount,
  orderTotal,
  actionLoading,
  onSendToCustomer,
  onReject,
}: PriceReviewPanelProps) {
  const pendingItems = items.filter((i) => i.price_review_status === 'pending');

  if (pendingItems.length === 0) return null;

  return (
    <div className="rounded-card border border-warning/40 bg-warning-light/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <h4 className="text-sm font-semibold text-slate-900">Price review required</h4>
        <Badge variant="warning">{pendingItems.length} pending</Badge>
      </div>

      <p className="mb-3 text-xs text-slate-600">
        Confirm the market price is correct, then notify the customer to pay the
        difference or cancel for a full refund. The platform does not absorb
        overages.
      </p>

      <div className="space-y-3">
        {pendingItems.map((item) => {
          const vendorUnitPrice = item.vendor_price ?? 0;
          const listedQuoted = listedLineTotal(item);
          const serviceFeeQuoted = quotedServiceFeeLine(item);
          const partTotalQuoted = customerLineTotal(item);
          const vendorLineTotal = vendorUnitPrice * item.quantity;
          const overListedBy = vendorLineTotal - listedQuoted;
          const revised = partPricingFromVendorUnit(vendorUnitPrice, item.quantity);
          const estTopUp = estimateCustomerTopUp(
            items,
            item.id,
            vendorUnitPrice,
            deliveryFee,
            discountAmount,
            orderTotal
          );

          return (
            <div
              key={item.id}
              className="rounded-button border border-warning/20 bg-white p-3"
            >
              <p className="font-medium text-slate-900">
                {item.quantity}x {item.description}
              </p>

              <dl className="mt-3 space-y-2 text-xs text-slate-600">
                <div className="rounded-button bg-slate-50 px-2 py-1.5">
                  <p className="mb-1 font-medium text-slate-500">Quoted to customer</p>
                  <div className="flex justify-between">
                    <dt>Listed part price</dt>
                    <dd className="font-medium">{formatCurrency(listedQuoted)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Service fee</dt>
                    <dd className="font-medium">{formatCurrency(serviceFeeQuoted)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <dt className="font-medium text-slate-700">Part total</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrency(partTotalQuoted)}
                    </dd>
                  </div>
                </div>

                <div className="rounded-button bg-slate-50 px-2 py-1.5">
                  <p className="mb-1 font-medium text-slate-500">Runner at market</p>
                  <div className="flex justify-between">
                    <dt>Target budget</dt>
                    <dd className="font-medium">{formatCurrency(listedQuoted)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Runner paid vendor</dt>
                    <dd className="font-semibold text-error">
                      {formatCurrency(vendorLineTotal)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <dt className="font-medium text-slate-700">Over listed price by</dt>
                    <dd className="font-semibold text-error">
                      {formatCurrency(overListedBy)}
                    </dd>
                  </div>
                </div>

                <div className="rounded-button bg-primary/5 px-2 py-1.5">
                  <p className="mb-1 font-medium text-slate-500">If customer accepts</p>
                  <div className="flex justify-between">
                    <dt>New listed price</dt>
                    <dd className="font-medium">{formatCurrency(revised.listedLine)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>New service fee (est.)</dt>
                    <dd className="font-medium">{formatCurrency(revised.serviceFee)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>New part total (est.)</dt>
                    <dd className="font-medium">{formatCurrency(revised.partTotal)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-primary/20 pt-1">
                    <dt className="font-medium text-slate-700">Est. order top-up</dt>
                    <dd className="font-semibold text-primary">
                      {formatCurrency(estTopUp)}
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  isLoading={actionLoading}
                  onClick={() => onSendToCustomer(item.id)}
                >
                  Notify customer
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  isLoading={actionLoading}
                  onClick={() => onReject(item.id)}
                >
                  Reject item
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
