'use client';

import { use } from 'react';
import { Loader2, Package, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { useOrder } from '@/lib/hooks/use-order';
import { formatCurrency } from '@/lib/utils/format';

const PAYMENT_LABELS: Record<string, string> = {
  wallet: 'Wallet',
  card: 'Card',
  cod: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function OrderCompleteContent({ orderId }: { orderId: string }) {
  const { order, isLoading, error } = useOrder(orderId);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20">
        <Package className="h-12 w-12 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">
          {error || 'Order not found'}
        </p>
        <Link href="/account?tab=orders">
          <Button variant="secondary">View Orders</Button>
        </Link>
      </div>
    );
  }

  const itemImages = order.order_items
    .map((item) => item.customer_image_url)
    .filter(Boolean) as string[];

  return (
    <div className="px-4 pb-12 lg:px-0">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Shop', href: '/search' },
          { label: 'Order Complete' },
        ]}
      />

      {/* Step indicator */}
      <div className="flex items-center gap-0 py-5 text-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-medium text-slate-400">
          1
        </span>
        <span className="ml-2 text-slate-400">Shopping cart</span>
        <span className="mx-3 h-px w-8 bg-slate-300" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-medium text-slate-400">
          2
        </span>
        <span className="ml-2 text-slate-400">Checkout details</span>
        <span className="mx-3 hidden h-px w-8 bg-slate-300 sm:block" />
        <span className="hidden h-6 w-6 items-center justify-center rounded-full bg-[#E07A3A] text-xs font-bold text-white sm:flex">
          3
        </span>
        <span className="ml-2 hidden font-medium text-[#E07A3A] sm:inline">
          Order complete
        </span>
      </div>

      {/* Main layout */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* ── Left: Order details card ── */}
        <div className="min-w-0 flex-1">
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
            <p className="text-sm font-medium text-[#E07A3A]">Thank you!</p>
            <h1 className="font-marketing-display mt-1 text-2xl font-bold text-slate-900">
              Your order has been received
            </h1>

            {/* Item thumbnails */}
            {itemImages.length > 0 && (
              <div className="mt-5 flex gap-3">
                {itemImages.slice(0, 4).map((url, i) => (
                  <div
                    key={i}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 sm:h-20 sm:w-20"
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
                {itemImages.length > 4 && (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-sm font-medium text-slate-400 sm:h-20 sm:w-20">
                    +{itemImages.length - 4}
                  </div>
                )}
              </div>
            )}

            {/* If no images, show item icons */}
            {itemImages.length === 0 && (
              <div className="mt-5 flex gap-3">
                {order.order_items.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 sm:h-20 sm:w-20"
                  >
                    <Package className="h-6 w-6 text-slate-300" />
                  </div>
                ))}
              </div>
            )}

            {/* Order details rows */}
            <div className="mt-6 space-y-3 text-sm">
              {order.total_weight_kg != null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total weight</span>
                  <span className="text-slate-900">
                    {order.total_weight_kg} kg
                    {order.delivery_tier
                      ? ` (${String(order.delivery_tier)})`
                      : ''}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-900">
                  {formatDate(order.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(order.revised_total ?? order.total)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment method</span>
                <span className="font-medium text-[#E07A3A]">
                  {PAYMENT_LABELS[order.payment_method] ||
                    order.payment_method}
                </span>
              </div>
            </div>

            {/* Track order button */}
            <div className="mt-8">
              <Link href={`/order/${order.id}`}>
                <Button fullWidth className="h-12 text-base">
                  Track your order
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Right: Success illustration ── */}
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="flex h-full items-start justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8">
            <div className="relative">
              {/* Decorative stars */}
              <svg
                className="absolute -left-8 -top-4 h-6 w-6 text-amber-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
              </svg>
              <svg
                className="absolute -right-6 top-2 h-4 w-4 text-amber-300"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
              </svg>
              <svg
                className="absolute -bottom-4 -left-4 h-3 w-3 text-amber-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
              </svg>
              <svg
                className="absolute -right-8 bottom-4 h-5 w-5 text-amber-300"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
              </svg>

              {/* Document with check */}
              <div className="rounded-2xl bg-slate-50 p-6">
                <div className="relative mx-auto h-28 w-24 rounded-xl bg-white shadow-md">
                  {/* Document lines */}
                  <div className="space-y-2 px-3 pt-5">
                    <div className="h-1.5 w-full rounded bg-slate-100" />
                    <div className="h-1.5 w-3/4 rounded bg-slate-100" />
                    <div className="h-1.5 w-5/6 rounded bg-slate-100" />
                  </div>
                  {/* Green check circle */}
                  <div className="absolute -bottom-4 -right-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 shadow-lg">
                    <CheckCircle className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function OrderCompletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <OrderCompleteContent orderId={id} />;
}
