'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrder } from '@/lib/hooks/use-order';
import { useUser } from '@/lib/hooks/use-user';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import {
  catalogUnitPrice,
  catalogLineTotal,
} from '@/lib/utils/order-pricing-display';

function ReceiptContent({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { order, isLoading, error } = useOrder(orderId);
  const { user } = useUser();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-20">
        <AlertTriangle className="h-12 w-12 text-slate-300" />
        <p className="text-sm text-slate-500">{error || 'Order not found'}</p>
        <Button variant="secondary" onClick={() => router.push('/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  if (order.status !== 'delivered') {
    router.replace(`/order/${orderId}`);
    return null;
  }

  return (
    <div>
      {/* Action bar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Link
          href={`/order/${orderId}`}
          className="rounded-button p-1 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <span className="flex-1 text-sm font-medium text-slate-700">
          Receipt
        </span>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Receipt body */}
      <div className="mx-auto max-w-lg px-4 py-6 print:max-w-none print:px-0 print:py-0">
        <div className="rounded-card border border-slate-200 bg-white p-6 print:rounded-none print:border-0 print:shadow-none">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-slate-900">PartsDey</h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">
              Receipt
            </p>
          </div>

          <div className="mb-5 flex items-start justify-between border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs text-slate-400">Order Number</p>
              <p className="text-sm font-medium text-slate-900">
                {order.order_number}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Date</p>
              <p className="text-sm font-medium text-slate-900">
                {formatDateTime(order.delivered_at ?? order.created_at)}
              </p>
            </div>
          </div>

          {/* Customer info */}
          <div className="mb-5 border-b border-slate-100 pb-5">
            <p className="mb-1 text-xs text-slate-400">Customer</p>
            {user && (
              <p className="text-sm text-slate-700">{user.full_name}</p>
            )}
            {user && (
              <p className="text-xs text-slate-500">{user.phone}</p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              {order.delivery_address}
            </p>
          </div>

          {/* Vehicle */}
          {order.vehicle && (
            <div className="mb-5 border-b border-slate-100 pb-5">
              <p className="mb-1 text-xs text-slate-400">Vehicle</p>
              <p className="text-sm text-slate-700">
                {order.vehicle.year} {order.vehicle.make} {order.vehicle.model}
                {order.vehicle.spec ? ` (${order.vehicle.spec})` : ''}
              </p>
            </div>
          )}

          {/* Items */}
          <div className="mb-5 border-b border-slate-100 pb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="pb-2 font-normal">Item</th>
                  <th className="pb-2 text-center font-normal">Qty</th>
                  <th className="pb-2 text-right font-normal">Price</th>
                  <th className="pb-2 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50">
                    <td className="py-2 pr-2 text-slate-700">
                      {item.description}
                    </td>
                    <td className="py-2 text-center text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="py-2 text-right text-slate-600">
                      {formatCurrency(
                        catalogUnitPrice(
                          item,
                          order.subtotal,
                          order.markup_amount
                        )
                      )}
                    </td>
                    <td className="py-2 text-right font-medium text-slate-700">
                      {formatCurrency(
                        catalogLineTotal(
                          item,
                          order.subtotal,
                          order.markup_amount
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing summary */}
          <div className="mb-5 space-y-1.5 border-b border-slate-100 pb-5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-700">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            {order.markup_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Service fee</span>
                <span className="text-slate-700">
                  {formatCurrency(order.markup_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Delivery fee</span>
              <span className="text-slate-700">
                {order.delivery_fee === 0
                  ? 'FREE'
                  : formatCurrency(order.delivery_fee)}
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-success">Discount</span>
                <span className="text-success">
                  -{formatCurrency(order.discount_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(order.revised_total ?? order.total)}
              </span>
            </div>
          </div>

          {/* Payment info */}
          <div className="mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment method</span>
              <span className="text-slate-700">
                {order.payment_method.toUpperCase()}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Payment status</span>
              <span className="font-medium text-success">
                {order.payment_status.charAt(0).toUpperCase() +
                  order.payment_status.slice(1)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-5 text-center">
            <p className="text-sm text-slate-600">
              Thank you for using PartsDey!
            </p>
            <p className="mt-1 text-xs text-slate-400">
              For support, contact us via WhatsApp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ReceiptContent orderId={id} />;
}
