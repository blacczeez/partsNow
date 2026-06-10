'use client';

import { CheckCircle, XCircle, Camera, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { runnerLineExpectedBudget } from '@/lib/utils/order-pricing-display';
import { cn } from '@/lib/utils/cn';
import type { OrderItem } from '@/lib/types/database';

interface OrderItemCardProps {
  item: OrderItem;
  canAct: boolean;
  onMarkFound: (itemId: string) => void;
  onMarkUnavailable: (itemId: string) => void;
}

export function OrderItemCard({
  item,
  canAct,
  onMarkFound,
  onMarkUnavailable,
}: OrderItemCardProps) {
  const isResolved = item.is_found || item.is_unavailable;

  return (
    <div
      className={cn(
        'rounded-card border p-4',
        item.is_found && 'border-success/30 bg-success-light/20',
        item.is_unavailable && 'border-error/30 bg-error-light/20',
        !isResolved && 'border-slate-200 bg-white'
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-slate-900">{item.description}</p>
          {item.oem_code && (
            <p className="mt-0.5 text-xs text-slate-500">OEM: {item.oem_code}</p>
          )}
          <p className="mt-1 text-sm text-slate-600">Qty: {item.quantity}</p>
          {!isResolved && (
            <p className="mt-1 text-sm font-medium text-success">
              Target: {formatCurrency(runnerLineExpectedBudget(item))}
              <span className="ml-1 font-normal text-slate-500">
                (negotiate at or below — above triggers price review)
              </span>
            </p>
          )}
        </div>

        {item.is_found && (
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" />
        )}
        {item.is_unavailable && (
          <XCircle className="h-5 w-5 flex-shrink-0 text-error" />
        )}
      </div>

      {/* Customer photo */}
      {item.customer_image_url && (
        <div className="mb-3">
          <img
            src={item.customer_image_url}
            alt="Customer reference"
            className="h-20 w-20 rounded-button border object-cover"
          />
        </div>
      )}

      {/* Found state details */}
      {item.is_found && (
        <div className="mt-2 space-y-1 border-t border-success/20 pt-2">
          <p className="text-sm text-slate-600">
            Vendor price: {item.vendor_price != null ? formatCurrency(item.vendor_price) : '---'}
          </p>
          {item.price_review_status === 'pending' && (
            <p className="text-xs font-medium text-warning">
              Submitted above target — waiting for admin review
            </p>
          )}
          {item.price_review_status === 'awaiting_customer' && (
            <p className="text-xs font-medium text-warning">
              Admin notified customer — waiting for accept or cancel
            </p>
          )}
          {item.price_review_status === 'customer_approved' && (
            <p className="text-xs font-medium text-success">
              Customer accepted — OK to hand off
            </p>
          )}
          {item.price_review_status === 'rejected' && (
            <p className="text-xs font-medium text-error">
              Price rejected by admin — check with ops
            </p>
          )}
          {item.qc_image_url && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Camera className="h-3.5 w-3.5" />
              <span>QC photo uploaded</span>
            </div>
          )}
        </div>
      )}

      {/* Unavailable state details */}
      {item.is_unavailable && item.unavailable_reason && (
        <div className="mt-2 border-t border-error/20 pt-2">
          <p className="text-sm text-slate-600">
            Reason: {item.unavailable_reason}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!isResolved && canAct && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="primary"
            className="flex-1"
            onClick={() => onMarkFound(item.id)}
          >
            <Search className="mr-1.5 h-4 w-4" />
            Found
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={() => onMarkUnavailable(item.id)}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Unavailable
          </Button>
        </div>
      )}
    </div>
  );
}
