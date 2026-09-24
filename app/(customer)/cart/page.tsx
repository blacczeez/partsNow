'use client';

import {
  ArrowLeft,
  Award,
  Minus,
  Plus,
  ShoppingCart,
  ShieldCheck,
  X,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/hooks/use-cart';
import { useUser } from '@/lib/hooks/use-user';
import { useDeliveryConfig } from '@/lib/hooks/use-delivery-config';
import { useLoyaltyConfig } from '@/lib/hooks/use-loyalty-config';
import { calculatePricing } from '@/lib/utils/pricing';
import { formatCurrency } from '@/lib/utils/format';
import { formatLoyaltyTier } from '@/lib/utils/loyalty';
import { cn } from '@/lib/utils/cn';
import type { LoyaltyTier } from '@/lib/types/database';

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    itemCount,
    subtotal,
    totalWeightKg,
    updateQuantity,
    removeItem,
  } = useCart();
  const { user } = useUser();
  const { deliveryConfig } = useDeliveryConfig();
  const { thresholds: loyaltyThresholds, enabled, baseMarkupPercentage } =
    useLoyaltyConfig();
  const pricingRuntime = {
    defaultMarkupPercentage: baseMarkupPercentage,
    loyaltyDiscountsEnabled: enabled,
  };

  const loyaltyTier = (user?.loyalty_tier || 'new') as LoyaltyTier;
  const pricingPreview = calculatePricing(
    items.map((item) => ({
      price: item.price,
      quantity: item.quantity,
      weightKg: item.weightKg,
    })),
    loyaltyTier,
    deliveryConfig,
    loyaltyThresholds,
    pricingRuntime
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20">
        <ShoppingCart className="h-16 w-16 text-slate-300" />
        <p className="text-lg font-medium text-slate-500">Your cart is empty</p>
        <p className="text-sm text-slate-400">
          Browse parts and add them to your cart
        </p>
        <Link href="/search">
          <Button>Browse Parts</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pb-12 lg:px-0">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Shop', href: '/search' },
          { label: 'Cart' },
        ]}
      />

      {/* Title with back */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-marketing-display text-xl font-bold text-slate-900 lg:text-2xl">
          My Cart ({itemCount})
        </h1>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-0 text-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E07A3A] text-xs font-bold text-white">
          1
        </span>
        <span className="ml-2 font-medium text-[#E07A3A]">Shopping cart</span>
        <span className="mx-3 h-px w-8 bg-slate-300" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-medium text-slate-400">
          2
        </span>
        <span className="ml-2 text-slate-400">Checkout details</span>
        <span className="mx-3 hidden h-px w-8 bg-slate-300 sm:block" />
        <span className="hidden h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-medium text-slate-400 sm:flex">
          3
        </span>
        <span className="ml-2 hidden text-slate-400 sm:inline">
          Order complete
        </span>
      </div>

      {/* Main layout: items table + sidebar */}
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* ── Items table ── */}
        <div className="min-w-0 flex-1">
          <div className="rounded-xl border border-slate-200 bg-white">
            {/* Table header — desktop */}
            <div className="hidden border-b border-slate-200 px-6 py-3 sm:flex">
              <span className="flex-1 text-sm font-medium text-slate-600">
                Product
              </span>
              <span className="w-40 text-sm font-medium text-slate-600">
                Quantity
              </span>
              <span className="w-36 text-sm font-medium text-slate-600">
                Total
              </span>
              <span className="w-8" />
            </div>

            {/* Items */}
            {items.map((item, index) => (
              <div
                key={item.partId}
                className={cn(
                  'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6',
                  index < items.length - 1 && 'border-b border-slate-100'
                )}
              >
                {/* Product: image + name */}
                <div className="flex flex-1 items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-6 w-6 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">
                    {item.name}
                  </p>
                </div>

                {/* Quantity + Total + Remove */}
                <div className="flex items-center justify-between gap-4 sm:justify-start">
                  {/* Quantity controls */}
                  <div className="flex w-40 items-center gap-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.partId, item.quantity - 1)
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex h-9 w-10 items-center justify-center border-y border-slate-300 text-sm font-medium text-slate-900">
                      {String(item.quantity).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.partId, item.quantity + 1)
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Total */}
                  <p className="w-36 text-sm font-semibold text-slate-900">
                    {formatCurrency(item.price * item.quantity)}
                  </p>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.partId)}
                    className="flex h-8 w-8 items-center justify-center text-red-400 hover:text-red-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* How delivery was calculated */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-marketing-display text-base font-bold text-slate-900">
                How delivery was calculated
              </h3>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white">
                  <Award className="h-3.5 w-3.5" />
                </span>
                {formatLoyaltyTier(loyaltyTier)} tier
              </span>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total weight</span>
                <span className="text-slate-900">
                  {pricingPreview.totalWeightKg ?? totalWeightKg} kg
                  {pricingPreview.deliveryTierLabel
                    ? ` (${pricingPreview.deliveryTierLabel})`
                    : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Express delivery</span>
                <span className="text-slate-900">
                  {pricingPreview.deliveryFeeLabel
                    ? pricingPreview.deliveryFeeLabel
                    : pricingPreview.deliveryTierLabel
                      ? `${pricingPreview.deliveryTierLabel} delivery (${pricingPreview.totalWeightKg ?? totalWeightKg} kg)`
                      : 'Standard'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery fee</span>
                <span className="font-medium text-slate-900">
                  {pricingPreview.deliveryFee === 0
                    ? 'FREE'
                    : formatCurrency(pricingPreview.deliveryFee)}
                </span>
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-slate-500">
              <Link
                href="/how-loyalty-works?from=cart"
                className="text-[#E07A3A] hover:underline"
              >
                How loyalty works
              </Link>
              {' · '}
              <Link
                href="/how-delivery-works?from=cart"
                className="text-[#E07A3A] hover:underline"
              >
                How delivery pricing works
              </Link>
            </p>
          </div>
        </div>

        {/* ── Order summary sidebar (desktop) ── */}
        <aside className="w-full lg:w-80 lg:shrink-0">
          <div className="sticky top-28 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-marketing-display mb-4 text-lg font-bold text-slate-900">
              Order summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Subtotal :</span>
                <span className="text-slate-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">VAT</span>
                <span className="text-slate-900">
                  {formatCurrency(pricingPreview.markupAmount)}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm font-semibold text-slate-900">
                Total
              </span>
              <span className="text-xl font-bold text-slate-900">
                {formatCurrency(pricingPreview.total)}
              </span>
            </div>

            <p className="mt-2 text-center text-xs text-slate-400">
              Shipping fee will be calculated in checkout
            </p>

            <Link href="/checkout" className="mt-4 block">
              <Button fullWidth className="h-12 text-base">
                Continue to check out
              </Button>
            </Link>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>100% payment security</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-16 left-0 right-0 z-10 border-t border-slate-200 bg-white px-4 py-3 shadow-lg lg:hidden">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-lg font-bold text-slate-900">
            {formatCurrency(pricingPreview.total)}
          </span>
        </div>
        <Link href="/checkout">
          <Button fullWidth className="h-12 text-base">
            Continue to check out
          </Button>
        </Link>
      </div>

      {/* Spacer so mobile content clears the fixed bar */}
      <div className="h-32 lg:hidden" aria-hidden />
    </div>
  );
}
