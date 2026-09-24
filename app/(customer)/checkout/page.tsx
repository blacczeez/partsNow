'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ShoppingCart,
  Wallet,
  CreditCard,
  Banknote,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { VehicleSelect } from '@/components/forms/vehicle-select';
import { useCart } from '@/lib/hooks/use-cart';
import { useUser } from '@/lib/hooks/use-user';
import { calculatePricing, isCodAllowedForCustomer } from '@/lib/utils/pricing';
import { useDeliveryConfig } from '@/lib/hooks/use-delivery-config';
import { useLoyaltyConfig } from '@/lib/hooks/use-loyalty-config';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import type { LoyaltyTier } from '@/lib/types/database';

function getSavedDeliveryAddress(
  profile: Record<string, unknown> | null | undefined
): string {
  const saved = profile?.delivery_address;
  return typeof saved === 'string' ? saved : '';
}

function getProfileField(
  profile: Record<string, unknown> | null | undefined,
  key: string
): string {
  const val = profile?.[key];
  return typeof val === 'string' ? val : '';
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const { user, wallet, refresh } = useUser();
  const { deliveryConfig } = useDeliveryConfig();
  const { thresholds: loyaltyThresholds, enabled, baseMarkupPercentage } =
    useLoyaltyConfig();
  const pricingRuntime = {
    defaultMarkupPercentage: baseMarkupPercentage,
    loyaltyDiscountsEnabled: enabled,
  };

  const profile = user?.profile as Record<string, unknown> | undefined;
  const savedAddress = getSavedDeliveryAddress(profile);
  const nameParts = (user?.full_name || '').split(' ');

  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [surname, setSurname] = useState(nameParts.slice(1).join(' ') || '');
  const [state, setState] = useState(getProfileField(profile, 'state') || 'Lagos');
  const [city, setCity] = useState(getProfileField(profile, 'city') || '');
  const [address, setAddress] = useState(savedAddress);
  const [phone, setPhone] = useState(user?.phone || '');
  const [postalCode, setPostalCode] = useState(getProfileField(profile, 'postal_code'));
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'cod'>('wallet');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const pricing = calculatePricing(
    pricingItems,
    loyaltyTier,
    deliveryConfig,
    loyaltyThresholds,
    pricingRuntime
  );
  const codAllowed = isCodAllowedForCustomer(
    pricing.total,
    profile
  );

  const walletBalance = wallet?.balance ?? 0;
  const walletSufficient = walletBalance >= pricing.total;

  async function handlePlaceOrder() {
    if (!address || address.length < 10) {
      toast('error', 'Please enter a valid delivery address');
      return;
    }
    if (!firstName.trim()) {
      toast('error', 'Please enter your first name');
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
        window.location.href = data.paymentUrl;
      } else {
        router.push(`/order/${data.id}/complete`);
      }
    } catch {
      toast('error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const paymentMethods: Array<{
    id: 'wallet' | 'card' | 'cod';
    label: string;
    description: string;
    icon: React.ReactNode;
    disabled: boolean;
  }> = [
    {
      id: 'wallet',
      label: 'Wallet',
      description: walletSufficient
        ? `Balance: ${formatCurrency(walletBalance)}`
        : `Pay with debit/credit card`,
      icon: <Wallet className="h-5 w-5" />,
      disabled: !walletSufficient,
    },
    {
      id: 'card',
      label: 'Card',
      description: 'Pay with debit/credit card',
      icon: <CreditCard className="h-5 w-5" />,
      disabled: false,
    },
    {
      id: 'cod',
      label: 'Cash on delivery',
      description: codAllowed
        ? 'Pay when your parts arrive'
        : 'Not available for this order',
      icon: <Banknote className="h-5 w-5" />,
      disabled: !codAllowed,
    },
  ];

  return (
    <div className="px-4 pb-12 lg:px-0">
      {/* Step indicator */}
      <div className="flex items-center gap-0 py-5 text-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-medium text-slate-400">
          1
        </span>
        <span className="ml-2 text-slate-400">Shopping cart</span>
        <span className="mx-3 h-px w-8 bg-slate-300" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E07A3A] text-xs font-bold text-white">
          2
        </span>
        <span className="ml-2 font-medium text-[#E07A3A]">Checkout details</span>
        <span className="mx-3 hidden h-px w-8 bg-slate-300 sm:block" />
        <span className="hidden h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-medium text-slate-400 sm:flex">
          3
        </span>
        <span className="ml-2 hidden text-slate-400 sm:inline">Order complete</span>
      </div>

      {/* Market price notice */}
      <div className="mb-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold">Market prices may differ from estimates</p>
          <p className="mt-1 leading-relaxed text-amber-900/80">
            Catalog prices are guides. If the part costs more at Ladipo/ASPAMDA, we
            will notify you before delivery. You can pay the difference to continue,
            or cancel for a full refund. We never charge more without your approval.
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* ── Left: Form ── */}
        <div className="min-w-0 flex-1">
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
              {/* Vehicle */}
              <FieldsetWrapper label="Vehicle" required>
                <VehicleSelect
                  selectedId={cart.vehicleId}
                  onSelect={(v) => cart.setVehicle(v?.id)}
                  className="!rounded-lg !border-slate-300 !shadow-none"
                />
              </FieldsetWrapper>

              {/* State */}
              <FieldsetWrapper label="State" required>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Enter state"
                  className="h-11 w-full rounded-lg border-0 bg-transparent px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </FieldsetWrapper>

              {/* First name */}
              <FieldsetWrapper label="First name" required>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className="h-11 w-full rounded-lg border-0 bg-transparent px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </FieldsetWrapper>

              {/* Surname */}
              <FieldsetWrapper label="Surname" required>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Enter surname"
                  className="h-11 w-full rounded-lg border-0 bg-transparent px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </FieldsetWrapper>

              {/* City */}
              <FieldsetWrapper label="City" required>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city"
                  className="h-11 w-full rounded-lg border-0 bg-transparent px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </FieldsetWrapper>

              {/* House address */}
              <FieldsetWrapper label="House address" required>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter address"
                  className="h-11 w-full rounded-lg border-0 bg-transparent px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </FieldsetWrapper>

              {/* Phone number */}
              <FieldsetWrapper label="Phone number" required>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter number"
                  className="h-11 w-full rounded-lg border-0 bg-transparent px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </FieldsetWrapper>

              {/* Postal code */}
              <FieldsetWrapper label="Postal code">
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Enter code"
                  className="h-11 w-full rounded-lg border-0 bg-transparent px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </FieldsetWrapper>

              {/* Delivery notes — full width */}
              <div className="sm:col-span-2">
                <FieldsetWrapper label="Delivery notes (optional)">
                  <textarea
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Any special instructions"
                    rows={3}
                    className="w-full resize-none rounded-lg border-0 bg-transparent px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </FieldsetWrapper>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <aside className="w-full lg:w-80 lg:shrink-0">
          <div className="space-y-4">
            {/* Order summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-lg font-bold text-slate-900">
                Order summary
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Subtotal :</span>
                  <span className="text-slate-900">
                    {formatCurrency(cart.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">VAT</span>
                  <span className="text-slate-900">
                    {formatCurrency(pricing.markupAmount)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm font-semibold text-slate-900">Total</span>
                <span className="text-xl font-bold text-slate-900">
                  {formatCurrency(pricing.total)}
                </span>
              </div>
            </div>

            {/* Payment method */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-lg font-bold text-slate-900">
                Payment method
              </h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => !method.disabled && setPaymentMethod(method.id)}
                    disabled={method.disabled}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition-colors',
                      paymentMethod === method.id && !method.disabled
                        ? 'border-primary bg-primary/5'
                        : method.disabled
                          ? 'border-slate-100 bg-slate-50 opacity-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        paymentMethod === method.id
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-slate-400'
                      )}
                    >
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {method.label}
                      </p>
                      <p className="text-xs text-slate-500">{method.description}</p>
                    </div>
                    <div
                      className={cn(
                        'h-5 w-5 shrink-0 rounded-full border-2',
                        paymentMethod === method.id
                          ? 'border-primary bg-primary'
                          : 'border-slate-300'
                      )}
                    >
                      {paymentMethod === method.id && (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Place order */}
            <Button
              fullWidth
              size="lg"
              onClick={handlePlaceOrder}
              isLoading={isSubmitting}
              disabled={!address || address.length < 10 || !firstName.trim()}
              className="h-12 text-base"
            >
              Place your order
            </Button>

            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
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
            {formatCurrency(pricing.total)}
          </span>
        </div>
        <Button
          fullWidth
          onClick={handlePlaceOrder}
          isLoading={isSubmitting}
          disabled={!address || address.length < 10 || !firstName.trim()}
          className="h-12 text-base"
        >
          Place your order
        </Button>
      </div>
      <div className="h-32 lg:hidden" aria-hidden />
    </div>
  );
}

/* ── Fieldset-style bordered input wrapper ── */
function FieldsetWrapper({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-300 px-3 pb-2 pt-0">
      <legend className="px-1 text-xs text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </legend>
      {children}
    </fieldset>
  );
}
