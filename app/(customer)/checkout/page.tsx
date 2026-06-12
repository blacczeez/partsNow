'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { VehicleSelect } from '@/components/forms/vehicle-select';
import { AddressInput } from '@/components/forms/address-input';
import { PricingSummary } from '@/components/orders/pricing-summary';
import { PaymentMethodSelect } from '@/components/orders/payment-method-select';
import { MarketPriceNotice } from '@/components/orders/price-change-notice';
import { useCart } from '@/lib/hooks/use-cart';
import { useUser } from '@/lib/hooks/use-user';
import { calculatePricing, isCodAllowedForCustomer } from '@/lib/utils/pricing';
import { useDeliveryConfig } from '@/lib/hooks/use-delivery-config';
import { DeliveryWeightSummary } from '@/components/orders/delivery-weight-summary';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';
import type { LoyaltyTier } from '@/lib/types/database';

function getSavedDeliveryAddress(
  profile: Record<string, unknown> | null | undefined
): string {
  const saved = profile?.delivery_address;
  return typeof saved === 'string' ? saved : '';
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const { user, wallet, refresh } = useUser();
  const { deliveryConfig } = useDeliveryConfig();

  const savedAddress = getSavedDeliveryAddress(
    user?.profile as Record<string, unknown> | undefined
  );
  const [addressOverride, setAddressOverride] = useState<string | null>(null);
  const address = addressOverride ?? savedAddress;
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'cod'>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showItems, setShowItems] = useState(false);

  // Redirect if cart is empty
  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20">
        <ShoppingCart className="h-16 w-16 text-slate-300" />
        <p className="text-lg font-medium text-slate-500">Your cart is empty</p>
        <Link href="/search">
          <Button>Browse Parts</Button>
        </Link>
      </div>
    );
  }

  const loyaltyTier = (user?.loyalty_tier || 'new') as LoyaltyTier;
  const pricingItems = cart.items.map((i) => ({
    price: i.price,
    quantity: i.quantity,
    weightKg: i.weightKg,
  }));
  const pricing = calculatePricing(pricingItems, loyaltyTier, deliveryConfig);
  const codAllowed = isCodAllowedForCustomer(
    pricing.total,
    user?.profile as Record<string, unknown> | undefined
  );

  async function handlePlaceOrder() {
    if (!address || address.length < 10) {
      toast('error', 'Please enter a valid delivery address');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            partId: item.partId,
            description: item.name,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.imageUrl,
          })),
          vehicleId: cart.vehicleId || undefined,
          deliveryAddress: address,
          deliveryNotes: deliveryNotes || undefined,
          paymentMethod,
          sourceChannel: 'web',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast('error', data.error || 'Failed to place order');
        return;
      }

      cart.clearCart();
      await refresh();

      if (data.paymentUrl) {
        // Card payment — redirect to Paystack
        window.location.href = data.paymentUrl;
      } else {
        // Wallet or COD — go to order detail
        toast('success', 'Order placed successfully!');
        router.push(`/order/${data.id}`);
      }
    } catch {
      toast('error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:top-[6.5rem]">
        <Link href="/cart" className="rounded-button p-1 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">Checkout</h1>
      </div>

      <div className="space-y-4 p-4">
        <MarketPriceNotice />

        {/* Vehicle Selection */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Vehicle</p>
          <VehicleSelect
            selectedId={cart.vehicleId}
            onSelect={(v) => cart.setVehicle(v?.id)}
          />
        </div>

        {/* Delivery Address */}
        <AddressInput
          value={address}
          onChange={setAddressOverride}
          error={address.length > 0 && address.length < 10 ? 'Address is too short' : undefined}
        />

        {/* Delivery Notes */}
        <div>
          <label
            htmlFor="delivery_notes"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Delivery Notes (optional)
          </label>
          <textarea
            id="delivery_notes"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="Any special instructions..."
            rows={2}
            className="w-full rounded-input border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Order Items (Collapsible) */}
        <div className="rounded-card border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setShowItems(!showItems)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <span className="text-sm font-medium text-slate-900">
              Order Items ({cart.itemCount})
            </span>
            {showItems ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {showItems && (
            <div className="border-t border-slate-100 px-4 py-2">
              {cart.items.map((item) => (
                <div
                  key={item.partId}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-slate-600">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing Breakdown */}
        <div className="rounded-card border border-slate-200 bg-white p-4 space-y-3">
          <DeliveryWeightSummary pricing={pricing} />
          <PricingSummary pricing={pricing} />
          <p className="text-center text-xs text-slate-500">
            <Link href="/how-delivery-works" className="text-primary hover:underline">
              How delivery pricing works
            </Link>
          </p>
        </div>

        {/* Payment Method */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Payment Method</p>
          <PaymentMethodSelect
            value={paymentMethod}
            onChange={setPaymentMethod}
            walletBalance={wallet?.balance ?? 0}
            codAllowed={codAllowed}
            total={pricing.total}
          />
        </div>

        {/* Place Order Button */}
        <Button
          fullWidth
          size="lg"
          onClick={handlePlaceOrder}
          isLoading={isSubmitting}
          disabled={!address || address.length < 10}
        >
          Place Order - {formatCurrency(pricing.total)}
        </Button>
      </div>
    </div>
  );
}
