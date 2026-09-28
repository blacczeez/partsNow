'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  LogOut,
  Package,
  Wallet,
  Truck,
  AlertCircle,
  Search,
  Loader2,
  ChevronRight,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Plus,
  Star,
  ShieldCheck,
  X,
  CloudUpload,
  CheckCircle2,
  Crown,
  Gift,
  Download,
  FileText,
  Pencil,
  Car,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { useUser } from '@/lib/hooks/use-user';
import { useOrder } from '@/lib/hooks/use-order';
import { useWallet } from '@/lib/hooks/use-wallet';
import type { EnrichedWalletTransaction } from '@/lib/types/wallet';
import {
  groupWalletTransactionsByDate,
  getWalletTransactionLabel,
  formatWalletTransactionListTime,
} from '@/lib/utils/wallet-transactions';
import type { WalletTransactionFilter } from '@/lib/utils/wallet-transactions';
import { useSelectedVehicle } from '@/lib/contexts/selected-vehicle-context';
import {
  updateProfileSchema,
  setupProfileSchema,
  type UpdateProfileInput,
  type SetupProfileInput,
} from '@/lib/validators/user';
import { formatPhone, formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import {
  ACTIVE_ORDER_STATUSES,
  TERMINAL_ORDER_STATUSES,
} from '@/lib/constants/order-status';
import type { OrderWithItems, OrderStatus, Vehicle } from '@/lib/types/database';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { VehicleForm } from '@/components/forms/vehicle-form';
import type { CreateVehicleInput } from '@/lib/validators/user';

/* ─── Sidebar sections ─── */
type Section = 'profile' | 'orders' | 'wallet' | 'vehicles' | 'shipping' | 'track' | 'report';

const SIDEBAR_ITEMS: Array<{
  id: Section;
  label: string;
  icon: typeof UserIcon;
}> = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'orders', label: 'Order', icon: Package },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'vehicles', label: 'My Vehicles', icon: Car },
  { id: 'shipping', label: 'Shipping Address', icon: MapPin },
  { id: 'track', label: 'Track orders', icon: Truck },
  { id: 'report', label: 'Report an issue', icon: AlertCircle },
];

/* ─── Order filter tabs ─── */
type OrderFilter = 'all' | 'in_progress' | 'delivered' | 'cancelled';

const ORDER_FILTERS: Array<{ id: OrderFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

/* ─── Wallet filter tabs ─── */
const WALLET_FILTERS: Array<{ id: WalletTransactionFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'topups', label: 'Top-up' },
  { id: 'orders', label: 'Orders' },
  { id: 'refunds', label: 'Refund' },
];

/* ─── Loyalty tier config ─── */
const LOYALTY_TIERS = [
  { id: 'new', label: 'New', minOrders: 0, color: 'bg-slate-100 text-[#0A0A0A]', discount: 0 },
  { id: 'verified', label: 'Verified', minOrders: 5, color: 'bg-blue-100 text-blue-700', discount: 0 },
  { id: 'trusted', label: 'Trusted', minOrders: 20, color: 'bg-purple-100 text-purple-700', discount: 5 },
  { id: 'partner', label: 'Partner', minOrders: 50, color: 'bg-amber-100 text-amber-700', discount: 8 },
] as const;

const PAYMENT_LABELS: Record<string, string> = {
  wallet: 'Wallet',
  card: 'Card',
  cod: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
};

/* ─── Status messages for display ─── */
function getStatusMessage(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Awaiting payment confirmation';
    case 'confirmed':
      return 'Your order has been confirmed';
    case 'sourcing':
      return 'Parts are being sourced at the market';
    case 'picked':
      return 'Parts have been picked up';
    case 'dispatched':
      return 'Your order is on its way!';
    case 'delivered':
      return 'Your order has been delivered';
    case 'cancelled':
      return 'This order was cancelled';
    case 'rejected':
      return 'This order was rejected';
    case 'failed':
      return 'Delivery was unsuccessful';
    default:
      return '';
  }
}

function formatOrderDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ─── Setup form (kept for new users) ─── */
function SetupForm({ phone, onComplete }: { phone?: string; onComplete: () => void }) {
  const { refreshVehicles } = useSelectedVehicle();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetupProfileInput>({
    resolver: zodResolver(setupProfileSchema),
    defaultValues: { add_vehicle: false },
  });

  const addVehicle = watch('add_vehicle');

  async function onSubmit(data: SetupProfileInput) {
    try {
      const res = await fetch('/api/users/me/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Setup failed');
      }
      toast('success', 'Profile created!');
      await refreshVehicles();
      onComplete();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-marketing-display mb-2 text-2xl font-bold text-slate-900">Complete Your Profile</h1>
      <p className="mb-6 text-sm text-slate-500">
        {phone ? `Signed in as ${formatPhone(phone)}` : 'Set up your account to start ordering'}
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full Name" id="full_name" placeholder="John Doe" error={errors.full_name?.message} {...register('full_name')} />
        <Input label="Email (optional)" id="email" type="email" placeholder="john@example.com" error={errors.email?.message} {...register('email')} />
        <Input label="Delivery Address" id="delivery_address" placeholder="123 Main Street, Ikeja, Lagos" error={errors.delivery_address?.message} {...register('delivery_address')} />
        <div className="rounded-card border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <input type="checkbox" className="h-4 w-4 rounded" {...register('add_vehicle')} />
            Add your car (optional)
          </label>
          <p className="mt-1 text-xs text-slate-500">Helps us show parts that fit and pre-fill checkout.</p>
          {addVehicle && (
            <div className="mt-4 space-y-3">
              <Input label="Make" id="vehicle_make" placeholder="Toyota" error={errors.vehicle?.make?.message} {...register('vehicle.make')} />
              <Input label="Model" id="vehicle_model" placeholder="Camry" error={errors.vehicle?.model?.message} {...register('vehicle.model')} />
              <Input label="Year" id="vehicle_year" type="number" placeholder="2018" error={errors.vehicle?.year?.message} {...register('vehicle.year', { valueAsNumber: true })} />
              <div>
                <label htmlFor="vehicle_spec" className="mb-1 block text-sm font-medium text-slate-700">Spec (optional)</label>
                <select id="vehicle_spec" className="w-full rounded-input border border-slate-300 px-3 py-2 text-sm" {...register('vehicle.spec')}>
                  <option value="">Select spec</option>
                  <option value="Nigerian">Nigerian</option>
                  <option value="American">American</option>
                  <option value="European">European</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Input label="Nickname (optional)" id="vehicle_nickname" placeholder="Workshop car" error={errors.vehicle?.nickname?.message} {...register('vehicle.nickname')} />
            </div>
          )}
        </div>
        <Button type="submit" fullWidth isLoading={isSubmitting}>Continue</Button>
      </form>
    </div>
  );
}

/* ─── Profile section ─── */
function ProfileSection({
  user,
  onLogout,
}: {
  user: {
    full_name: string;
    phone: string;
    email: string | null;
    profile: Record<string, unknown>;
    loyalty_tier: string;
    total_orders: number;
    lifetime_spend: number;
  };
  onLogout: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const { refresh } = useUser();

  if (editing) {
    return (
      <EditProfileForm
        user={user}
        onDone={() => {
          setEditing(false);
          refresh();
        }}
      />
    );
  }

  const currentTierIdx = LOYALTY_TIERS.findIndex((t) => t.id === user.loyalty_tier);
  const currentTier = LOYALTY_TIERS[currentTierIdx] || LOYALTY_TIERS[0];
  const nextTier = LOYALTY_TIERS[currentTierIdx + 1];
  const ordersToNext = nextTier ? nextTier.minOrders - user.total_orders : 0;
  const tierProgress = nextTier
    ? Math.min(
        ((user.total_orders - currentTier.minOrders) /
          (nextTier.minOrders - currentTier.minOrders)) *
          100,
        100
      )
    : 100;

  const initials = (() => {
    const parts = user.full_name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (parts[0]?.[0] ?? '?').toUpperCase();
  })();

  return (
    <div className="space-y-6">
      <h2 className="font-marketing-display text-xl font-bold text-slate-900">My Profile</h2>

      {/* Profile card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#321A71] text-xl font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{user.full_name}</p>
              <span
                className={cn(
                  'mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  currentTier.color
                )}
              >
                <Crown className="h-3 w-3" />
                {currentTier.label} tier
              </span>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>

        {/* Contact details */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <fieldset className="rounded-lg border border-slate-200 px-3 pb-3 pt-2">
            <legend className="px-1 text-xs text-[#0A0A0A]">Phone</legend>
            <p className="text-sm text-slate-900">{formatPhone(user.phone)}</p>
          </fieldset>
          <fieldset className="rounded-lg border border-slate-200 px-3 pb-3 pt-2">
            <legend className="px-1 text-xs text-[#0A0A0A]">Email</legend>
            <p className="text-sm text-slate-900">{user.email || '—'}</p>
          </fieldset>
          {(user.profile?.delivery_address as string) ? (
            <fieldset className="rounded-lg border border-slate-200 px-3 pb-3 pt-2 sm:col-span-2">
              <legend className="px-1 text-xs text-[#0A0A0A]">Delivery address</legend>
              <p className="text-sm text-slate-900">{String(user.profile.delivery_address)}</p>
            </fieldset>
          ) : null}
        </div>

        {/* Stats row */}
        <div className="mt-5 flex gap-4">
          <div className="flex-1 rounded-lg bg-slate-50 px-4 py-3 text-center">
            <p className="text-lg font-bold text-slate-900">{user.total_orders}</p>
            <p className="text-xs text-slate-500">Orders</p>
          </div>
          <div className="flex-1 rounded-lg bg-slate-50 px-4 py-3 text-center">
            <p className="text-lg font-bold text-slate-900">{formatCurrency(user.lifetime_spend)}</p>
            <p className="text-xs text-slate-500">Total spent</p>
          </div>
        </div>
      </div>

      {/* Loyalty program card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-[#FF6600]" />
          <h3 className="font-marketing-display text-base font-bold text-slate-900">Loyalty Program</h3>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          {nextTier
            ? `Place ${ordersToNext} more order${ordersToNext !== 1 ? 's' : ''} to reach ${nextTier.label} tier and unlock ${nextTier.discount}% discount.`
            : 'You\'ve reached the highest tier! Enjoy your exclusive benefits.'}
        </p>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">{currentTier.label}</span>
            {nextTier && (
              <span className="text-[#0A0A0A]">{nextTier.label}</span>
            )}
          </div>
          <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#FF6600] to-amber-400 transition-all duration-500"
              style={{ width: `${tierProgress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[#0A0A0A]">
            {user.total_orders} / {nextTier?.minOrders ?? currentTier.minOrders} orders
          </p>
        </div>

        {/* Tier benefits */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LOYALTY_TIERS.map((tier) => {
            const isActive = tier.id === user.loyalty_tier;
            const isUnlocked = LOYALTY_TIERS.indexOf(tier) <= currentTierIdx;
            return (
              <div
                key={tier.id}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-center transition-colors',
                  isActive
                    ? 'border-[#FF6600] bg-orange-50'
                    : isUnlocked
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-100 bg-slate-50 opacity-60'
                )}
              >
                <Crown
                  className={cn(
                    'mx-auto h-4 w-4',
                    isActive ? 'text-[#FF6600]' : isUnlocked ? 'text-[#0A0A0A]' : 'text-slate-300'
                  )}
                />
                <p className={cn(
                  'mt-1 text-xs font-semibold',
                  isActive ? 'text-[#FF6600]' : 'text-[#0A0A0A]'
                )}>
                  {tier.label}
                </p>
                <p className="text-[10px] text-[#0A0A0A]">
                  {tier.discount > 0 ? `${tier.discount}% off` : 'Base rate'}
                </p>
              </div>
            );
          })}
        </div>

        <Link
          href="/how-loyalty-works?from=loyalty"
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#FF6600] hover:underline"
        >
          How loyalty works
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Logout — mobile only (desktop has it in sidebar) */}
      <div className="lg:hidden">
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </div>
  );
}

function EditProfileForm({
  user,
  onDone,
}: {
  user: { full_name: string; email: string | null; profile: Record<string, unknown> };
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      full_name: user.full_name,
      email: user.email || '',
      profile: { delivery_address: (user.profile?.delivery_address as string) || '' },
    },
  });

  async function onSubmit(data: UpdateProfileInput) {
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Update failed');
      toast('success', 'Profile updated');
      onDone();
    } catch {
      toast('error', 'Failed to update profile');
    }
  }

  return (
    <div>
      <h2 className="font-marketing-display mb-6 text-xl font-bold text-slate-900">Edit Profile</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <fieldset className="rounded-lg border border-slate-300 px-3 pb-3 pt-2">
            <legend className="px-1 text-xs text-slate-500">Full Name</legend>
            <input
              {...register('full_name')}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-[#0A0A0A] focus:outline-none"
              placeholder="John Doe"
            />
            {errors.full_name && (
              <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>
            )}
          </fieldset>

          <fieldset className="rounded-lg border border-slate-300 px-3 pb-3 pt-2">
            <legend className="px-1 text-xs text-slate-500">Email</legend>
            <input
              {...register('email')}
              type="email"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-[#0A0A0A] focus:outline-none"
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </fieldset>

          <fieldset className="rounded-lg border border-slate-300 px-3 pb-3 pt-2">
            <legend className="px-1 text-xs text-slate-500">Delivery Address</legend>
            <input
              {...register('profile.delivery_address')}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-[#0A0A0A] focus:outline-none"
              placeholder="123 Main Street, Ikeja, Lagos"
            />
            {errors.profile?.delivery_address && (
              <p className="mt-1 text-xs text-red-500">{errors.profile.delivery_address.message}</p>
            )}
          </fieldset>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onDone}
              className="flex-1  py-2.5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              className="flex-1"
            >
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Orders section ─── */
function OrdersSection() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (filter === 'in_progress') params.set('status', 'active');
        else if (filter !== 'all') params.set('status', filter);

        const res = await fetch(`/api/orders?${params}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadOrders();
    return () => { cancelled = true; };
  }, [filter]);

  // If an order is selected, show the detail view
  if (selectedOrderId) {
    return (
      <OrderDetailView
        orderId={selectedOrderId}
        onBack={() => setSelectedOrderId(null)}
      />
    );
  }

  const filteredOrders = searchQuery.trim()
    ? orders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.order_items.some((item) =>
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : orders;

  const activeOrders = filteredOrders.filter((o) =>
    ACTIVE_ORDER_STATUSES.includes(o.status)
  );
  const pastOrders = filteredOrders.filter((o) =>
    TERMINAL_ORDER_STATUSES.includes(o.status)
  );

  return (
    <div>
      {/* Filter tabs + Search row */}
      <div className="mb-6 flex flex-col gap-3 bg-white rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {ORDER_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                filter === f.id
                  ? 'border-[#FF6600] text-[#FF6600]'
                  : 'border-slate-200 text-[#A3A3A3] hover:border-slate-300 hover:text-[#0A0A0A]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Item name, order ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-900 placeholder:text-[#A3A3A3] focus:border-[#FF6600] focus:outline-none focus:ring-1 focus:ring-[#FF6600]"
          />
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Package className="h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No orders found</p>
          <p className="text-xs text-[#0A0A0A]">Orders you place will appear here</p>
          <Link href="/search">
            <Button>Browse Parts</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-4 text-xl font-semibold text-slate-900">
                Active Orders
              </h3>
              <div className="space-y-4">
                {activeOrders.map((order) => (
                  <AccountOrderCard
                    key={order.id}
                    order={order}
                    onViewDetails={() => setSelectedOrderId(order.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past Orders */}
          {pastOrders.length > 0 && (
            <div>
              <h3 className="mb-4 text-xl font-semibold text-slate-900">
                Past Orders
              </h3>
              <div className="space-y-4">
                {pastOrders.map((order) => (
                  <AccountOrderCard
                    key={order.id}
                    order={order}
                    onViewDetails={() => setSelectedOrderId(order.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Account-specific order card ─── */
function getAccountOrderTitle(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Awaiting payment confirmation';
    case 'confirmed':
    case 'sourcing':
    case 'picked':
      return "We're processing your orders";
    case 'dispatched':
      return 'Your order is on its way';
    case 'delivered':
      return 'Your order has been delivered';
    case 'cancelled':
      return 'This order was cancelled';
    case 'rejected':
      return 'This order was rejected';
    case 'failed':
      return 'Delivery was unsuccessful';
    default:
      return getStatusMessage(status);
  }
}

function getAccountOrderBadge(status: OrderStatus): {
  label: string;
  className: string;
} {
  if (ACTIVE_ORDER_STATUSES.includes(status)) {
    return {
      label: 'In Progress',
      className: 'bg-[#FFF0E6] text-[#E57105]',
    };
  }
  switch (status) {
    case 'delivered':
      return { label: 'Delivered', className: 'bg-green-100 text-green-800' };
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-red-100 text-red-800' };
    case 'rejected':
      return { label: 'Rejected', className: 'bg-red-100 text-red-800' };
    case 'failed':
      return { label: 'Failed', className: 'bg-red-100 text-red-800' };
    default:
      return { label: status, className: 'bg-slate-100 text-slate-700' };
  }
}

function formatAccountOrderDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-NG', { month: 'long' });
  const year = date.getFullYear();
  return `${day}, ${month} ${year}`;
}

function AccountOrderCard({
  order,
  onViewDetails,
}: {
  order: OrderWithItems;
  onViewDetails: () => void;
}) {
  const itemCount = order.order_items.reduce((sum, i) => sum + i.quantity, 0);
  const thumbnails = order.order_items
    .map((i) => i.customer_image_url)
    .filter(Boolean) as string[];

  const estimatedDate = order.delivered_at
    ? formatAccountOrderDate(order.delivered_at)
    : formatAccountOrderDate(order.created_at);

  const badge = getAccountOrderBadge(order.status);
  const overflowCount =
    (thumbnails.length || order.order_items.length) > 4
      ? (thumbnails.length || order.order_items.length) - 4
      : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Top metadata bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-[#F5F3FF] px-4 py-2.5 text-sm sm:px-5">
        <p className="text-[#4B5563]">
          Order ID:{' '}
          <span className="font-semibold text-slate-900">
            #{order.order_number}
          </span>
        </p>
        <p className="text-[#4B5563]">
          Estimated Arrival:{' '}
          <span className="font-semibold text-slate-900">{estimatedDate}</span>
        </p>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2 p-4 sm:flex-row  sm:justify-between sm:gap-6 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
            <Truck className="h-3 w-3 shrink-0" strokeWidth={1.75} />
            <span>
              Ship | {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
          </div>

          <h4 className="mt-1 text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
            {getAccountOrderTitle(order.status)}
          </h4>

          <span
            className={cn(
              'mt-2 inline-flex px-2  text-sm font-medium',
              badge.className
            )}
          >
            {badge.label}
          </span>

          <div className="mt-4 flex gap-2">
            {thumbnails.length > 0
              ? thumbnails.slice(0, 4).map((url, i) => (
                  <div
                    key={i}
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-16 sm:w-16"
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))
              : order.order_items.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 sm:h-16 sm:w-16"
                  >
                    <Package className="h-5 w-5 text-slate-300" />
                  </div>
                ))}
            {overflowCount > 0 && (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium text-slate-500 sm:h-16 sm:w-16">
                +{overflowCount}
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={onViewDetails}
          className="h-11 w-full shrink-0 bg-[#321A71] text-white hover:bg-[#321A71]/opacity-90 sm:w-auto sm:px-6"
        >
          View details
        </Button>
      </div>
    </div>
  );
}

/* ─── Order detail view (inline in account page) ─── */

const ORDER_PROGRESS_STEPS = [
  { key: 'confirmed', label: 'Review order' },
  { key: 'sourcing', label: 'Preparing order' },
  { key: 'dispatched', label: 'Shipping' },
  { key: 'delivered', label: 'Delivered' },
] as const;

function getProgressIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return 0;
    case 'sourcing':
    case 'picked':
      return 1;
    case 'dispatched':
      return 2;
    case 'delivered':
      return 3;
    default:
      return -1; // cancelled/failed/rejected
  }
}

function OrderDetailView({
  orderId,
  onBack,
}: {
  orderId: string;
  onBack: () => void;
}) {
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
      <div className="flex flex-col items-center gap-4 py-16">
        <Package className="h-12 w-12 text-slate-300" />
        <p className="text-sm text-[#0A0A0A]">{error || 'Order not found'}</p>
        <Button variant="secondary" onClick={onBack}>
          Back to orders
        </Button>
      </div>
    );
  }

  const progressIdx = getProgressIndex(order.status);
  const isCancelled = ['cancelled', 'rejected', 'failed'].includes(order.status);
  const deliveryAddress = order.delivery_address || (user?.profile?.delivery_address as string) || '';

  const estimatedArrival = order.delivered_at
    ? formatOrderDate(order.delivered_at)
    : order.dispatched_at
      ? formatOrderDate(order.dispatched_at)
      : formatOrderDate(order.created_at);

  // Delivery fee breakdown data
  const breakdown = order.delivery_fee_breakdown as Record<string, unknown> | null;

  return (
    <div>
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </button>

      {/* Two-column layout */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* ── Left column ── */}
        <div className="min-w-0 flex-1">
          {/* Header: order ID + status */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#0A0A0A]">
                Order ID:{' '}
                <span className="font-bold text-slate-900">
                  #{order.order_number}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-[#0A0A0A]">
                Order Date: {formatOrderDate(order.created_at)}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {/* From + Estimated Arrival bar */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
            <span className="text-slate-500">
              From: <span className="font-semibold text-slate-900">Ladipo</span>
            </span>
            <span className="text-slate-500">
              Estimated Arrival:{' '}
              <span className="font-semibold text-slate-900">{estimatedArrival}</span>
            </span>
          </div>

          {/* Progress steps */}
          {!isCancelled && (
            <div className="mt-5">
              <div className="flex items-center justify-between">
                {ORDER_PROGRESS_STEPS.map((step, i) => (
                  <div key={step.key} className="flex flex-col items-center">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        i <= progressIdx ? 'text-slate-900' : 'text-[#0A0A0A]'
                      )}
                    >
                      {i === progressIdx && '✨ '}
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div className="relative mt-2 h-1.5 w-full rounded-full bg-slate-200">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#FF6600] to-amber-400"
                  style={{
                    width:
                      progressIdx < 0
                        ? '0%'
                        : `${((progressIdx + 0.5) / ORDER_PROGRESS_STEPS.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              This order was {order.status}.
              {order.cancelled_at && ` on ${formatOrderDate(order.cancelled_at)}`}
            </div>
          )}

          {/* Products */}
          <h3 className="font-marketing-display mb-4 mt-8 text-lg font-bold text-slate-900">Products</h3>
          <div className="space-y-4">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                  {item.customer_image_url ? (
                    <img
                      src={item.customer_image_url}
                      alt={item.description}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-8 w-8 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{item.description}</p>
                  {item.weight_kg != null && (
                    <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {order.delivery_tier ? `${order.delivery_tier} - ` : ''}
                      {item.weight_kg}kg
                    </span>
                  )}
                  {item.oem_code && (
                    <p className="mt-1 text-sm text-[#0A0A0A]">{item.oem_code}</p>
                  )}
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {formatCurrency(item.selling_price)}
                  </p>
                  <p className="text-sm text-slate-500">Quantity: {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-marketing-display mb-4 text-lg font-bold text-slate-900">
              Order summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subtotal :</span>
                <span className="text-slate-900">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">VAT</span>
                <span className="text-slate-900">
                  {formatCurrency(order.markup_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Shipping fee</span>
                <span className="text-slate-900">
                  {formatCurrency(order.delivery_fee)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(order.revised_total ?? order.total)}
                </span>
              </div>
            </div>
          </div>

          {/* How delivery was calculated */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-marketing-display text-lg font-bold text-slate-900">
                How delivery was calculated
              </h3>
              <Link
                href="/how-delivery-works"
                className="text-sm font-medium text-[#FF6600] hover:underline"
              >
                How it works
              </Link>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total package weight</span>
                <span className="text-slate-900">
                  {order.total_weight_kg ?? '—'} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Weight tier</span>
                <span className="text-slate-900">
                  {order.delivery_tier || 'Standard'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Base tier fee</span>
                <span className="text-slate-900">
                  {formatCurrency(
                    (breakdown?.base_fee as number) ?? order.delivery_fee
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Charged delivery fee</span>
                <span className="text-slate-900">
                  {formatCurrency(order.delivery_fee)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery type</span>
                <span className="text-slate-900">
                  {order.delivery_type === 'express'
                    ? `Express (${order.promised_delivery_minutes ?? 45}min)`
                    : 'Standard'}
                </span>
              </div>
            </div>
          </div>

          {/* Receipt (for delivered orders) */}
          {order.status === 'delivered' && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#0A0A0A]" />
                  <h3 className="font-marketing-display text-base font-bold text-slate-900">Receipt</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toast('success', 'Receipt download started');
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order number</span>
                    <span className="font-medium text-slate-900">#{order.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date</span>
                    <span className="text-slate-900">{formatOrderDate(order.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment method</span>
                    <span className="text-slate-900">
                      {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Items</span>
                    <span className="text-slate-900">{order.order_items.length}</span>
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="text-slate-900">{formatCurrency(order.subtotal)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery fee</span>
                    <span className="text-slate-900">{formatCurrency(order.delivery_fee)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Discount</span>
                      <span className="text-green-600">-{formatCurrency(order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-slate-200 pt-2.5">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-900">Total paid</span>
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(order.revised_total ?? order.total)}
                      </span>
                    </div>
                  </div>
                  {order.delivered_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Delivered on</span>
                      <span className="text-slate-900">{formatOrderDate(order.delivered_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rating (for delivered orders) */}
          {order.status === 'delivered' && (
            <OrderRating
              orderId={order.id}
              existingRating={order.rating}
              existingComment={order.rating_comment}
            />
          )}
        </div>

        {/* ── Right sidebar ── */}
        <aside className="w-full shrink-0 lg:w-72">
          {/* About Rider */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="font-marketing-display mb-3 text-base font-bold text-slate-900">
              About Rider
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#321A71] text-lg font-bold text-white">
                {getRiderInitials(order)}
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {getRiderName(order)}
                </p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                  Verified rider
                </p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  4.8 / 5.0
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="font-marketing-display mb-3 text-base font-bold text-slate-900">
              Shipping Address
            </h4>
            {/* Map placeholder */}
            <div className="mb-3 h-32 overflow-hidden rounded-lg bg-slate-100">
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${
                  order.delivery_latitude || '6.5244'
                },${
                  order.delivery_longitude || '3.3792'
                }&zoom=13&size=300x150&scale=2&maptype=roadmap&key=`}
                alt="Map"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <p className="text-sm leading-relaxed text-[#0A0A0A]">
              {deliveryAddress || 'No address provided'}
            </p>
          </div>

          {/* Contact Information */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="font-marketing-display mb-3 text-base font-bold text-slate-900">
              Contact Information
            </h4>
            <div className="space-y-2">
              {user?.email && (
                <a
                  href={`mailto:${user.email}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-[#321A71] hover:bg-slate-50"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </a>
              )}
              {user?.phone && (
                <a
                  href={`tel:${user.phone}`}
                  className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-[#321A71] hover:bg-slate-50"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {user.phone}
                </a>
              )}
            </div>
          </div>

          {/* Track on dedicated page */}
          <div className="mt-4">
            <Link href={`/order/${order.id}`}>
              <Button fullWidth variant="secondary" className="h-11">
                <Truck className="mr-2 h-4 w-4" />
                Track order
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function getRiderName(order: { order_assignments: unknown[] }): string {
  const assignments = order.order_assignments as Array<{
    role: string;
    assignee_name?: string;
  }>;
  const rider = assignments?.find((a) => a.role === 'rider');
  return rider?.assignee_name || 'Rider assigned';
}

function getRiderInitials(order: { order_assignments: unknown[] }): string {
  const name = getRiderName(order);
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? 'R').toUpperCase();
}

/* ─── Order rating component ─── */
function OrderRating({
  orderId,
  existingRating,
  existingComment,
}: {
  orderId: string;
  existingRating: number | null;
  existingComment: string | null;
}) {
  const [rating, setRating] = useState(existingRating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existingComment ?? '');
  const [submitted, setSubmitted] = useState(!!existingRating);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmitRating() {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit rating');
      }
      setSubmitted(true);
      toast('success', 'Thank you for your feedback!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-marketing-display text-base font-bold text-slate-900">
        {submitted ? 'Your Rating' : 'Rate this order'}
      </h3>

      {/* Stars */}
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={submitted}
            onMouseEnter={() => !submitted && setHovered(star)}
            onMouseLeave={() => !submitted && setHovered(0)}
            onClick={() => !submitted && setRating(star)}
            className="transition-transform hover:scale-110 disabled:cursor-default disabled:hover:scale-100"
          >
            <Star
              className={cn(
                'h-7 w-7',
                (hovered || rating) >= star
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-200'
              )}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 self-center text-sm text-slate-500">
            {rating}/5
          </span>
        )}
      </div>

      {/* Comment */}
      {!submitted && (
        <>
          <fieldset className="mt-4 rounded-lg border border-slate-300 px-3 pb-3 pt-2">
            <legend className="px-1 text-xs text-slate-500">Comment (optional)</legend>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-slate-900 placeholder:text-[#0A0A0A] focus:outline-none"
              placeholder="Tell us about your experience..."
            />
          </fieldset>
          <button
            type="button"
            onClick={handleSubmitRating}
            disabled={rating === 0 || submitting}
            className={cn(
              'mt-3 w-full rounded-full py-2.5 text-sm font-medium transition-colors',
              rating > 0
                ? 'bg-[#321A71] text-white hover:bg-[#2a1a5e]'
                : 'bg-slate-100 text-[#0A0A0A]'
            )}
          >
            {submitting ? 'Submitting...' : 'Submit rating'}
          </button>
        </>
      )}

      {submitted && existingComment && (
        <p className="mt-2 text-sm italic text-slate-500">&ldquo;{existingComment}&rdquo;</p>
      )}
      {submitted && comment && !existingComment && (
        <p className="mt-2 text-sm italic text-slate-500">&ldquo;{comment}&rdquo;</p>
      )}
    </div>
  );
}

/* ─── Wallet section ─── */
function WalletSection() {
  const {
    balance,
    transactions,
    summary,
    filter,
    setFilter,
    isLoadingBalance,
    isLoadingTransactions,
    hasMore,
    refreshBalance,
    refreshTransactions,
    loadMoreTransactions,
  } = useWallet();

  const [showFundModal, setShowFundModal] = useState(false);

  const dateGroups = groupWalletTransactionsByDate(transactions);

  return (
    <div>
      {/* Balance hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#321A71] px-6 py-8">
        {/* Decorative grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="wallet-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wallet-grid)" />
          </svg>
        </div>

        <div className="relative flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm text-slate-300">
              <Wallet className="h-4 w-4" />
              Available Balance
            </p>
            {isLoadingBalance ? (
              <Loader2 className="mt-3 h-8 w-8 animate-spin text-white/60" />
            ) : (
              <p className="mt-2 text-4xl font-bold text-white">
                {formatCurrency(balance?.balance ?? 0)}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowFundModal(true)}
            className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            <Plus className="h-4 w-4" />
            Fund Wallet
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="mt-6 flex flex-wrap gap-2">
        {WALLET_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              filter === f.id
                ? 'border-[#FF6600] text-[#FF6600]'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Money in / Money out summary */}
      {summary && (
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Money in</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatCurrency(summary.moneyIn)}
                </p>
                <p className="mt-0.5 text-xs text-[#0A0A0A]">
                  {summary.periodLabel}
                </p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <ArrowDownLeft className="h-4 w-4" />
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Money out</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatCurrency(summary.moneyOut)}
                </p>
                <p className="mt-0.5 text-xs text-[#0A0A0A]">
                  {summary.periodLabel}
                </p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Transaction list grouped by date */}
      <div className="mt-8">
        {isLoadingTransactions && transactions.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Wallet className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No transactions yet</p>
          </div>
        ) : (
          dateGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <h4 className="font-marketing-display mb-3 text-base font-bold text-slate-900">
                {group.label}
              </h4>
              <div className="space-y-2">
                {group.transactions.map((tx) => (
                  <WalletTransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            </div>
          ))
        )}

        {hasMore && (
          <div className="flex justify-center py-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadMoreTransactions}
              isLoading={isLoadingTransactions}
            >
              Load more
            </Button>
          </div>
        )}
      </div>

      {/* Fund wallet modal */}
      <FundWalletModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        onSuccess={async () => {
          await Promise.all([refreshBalance(), refreshTransactions()]);
        }}
      />
    </div>
  );
}

const PRESET_AMOUNTS = [5_000, 10_000, 20_000, 30_000, 40_000, 50_000];

function FundWalletModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [amount, setAmount] = useState(5_000);
  const [customInput, setCustomInput] = useState('5,000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handlePresetClick(value: number) {
    setAmount(value);
    setCustomInput(value.toLocaleString());
  }

  function handleInputChange(raw: string) {
    // Strip non-digits
    const digits = raw.replace(/\D/g, '');
    const num = parseInt(digits, 10) || 0;
    setAmount(num);
    setCustomInput(num ? num.toLocaleString() : '');
  }

  function clearInput() {
    setAmount(0);
    setCustomInput('');
  }

  async function handlePay() {
    if (amount < 100) {
      toast('error', 'Minimum top-up is ₦100');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast('error', data.error || 'Top-up failed');
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      toast('error', 'Failed to initiate top-up');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fund wallet">
      <p className="mb-4 text-sm text-[#0A0A0A]">
        Select amount to withdraw or enter amount
      </p>

      {/* Amount input */}
      <div className="relative mb-4">
        <input
          type="text"
          inputMode="numeric"
          value={customInput}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-semibold text-slate-900 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
          placeholder="0"
        />
        {customInput && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0A0A0A] hover:text-[#0A0A0A]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Preset amount chips */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        {PRESET_AMOUNTS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              'rounded-xl border py-2.5 text-sm font-medium transition-colors',
              amount === preset
                ? 'border-green-400 bg-green-50 text-green-800'
                : 'border-slate-200 text-slate-700 hover:border-slate-300'
            )}
          >
            {preset.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Pay button */}
      <Button
        fullWidth
        className="h-12 bg-[#321A71] text-base hover:bg-[#2a1a5e]"
        onClick={handlePay}
        isLoading={isSubmitting}
        disabled={!amount || amount < 100}
      >
        Pay N{amount ? amount.toLocaleString() : '0'} with paystack
      </Button>
    </Modal>
  );
}

function WalletTransactionRow({ tx }: { tx: EnrichedWalletTransaction }) {
  const isCredit = tx.type === 'credit' || tx.type === 'release';
  const label = getWalletTransactionLabel(tx);
  const timeStr = formatWalletTransactionListTime(tx.created_at);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      {/* Icon */}
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          isCredit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
        )}
      >
        {tx.kind === 'topup' ? (
          <ArrowDownLeft className="h-4 w-4" />
        ) : tx.kind === 'refund' || tx.kind === 'partial_refund' ? (
          <RotateCcw className="h-4 w-4" />
        ) : (
          <ArrowUpRight className="h-4 w-4" />
        )}
      </span>

      {/* Label + time */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 truncate">{label}</p>
        <p className="text-xs text-[#0A0A0A]">{timeStr}</p>
      </div>

      {/* Amount + balance after */}
      <div className="text-right">
        <p
          className={cn(
            'text-sm font-semibold',
            isCredit ? 'text-green-600' : 'text-red-500'
          )}
        >
          {isCredit ? '+' : '-'}
          {formatCurrency(tx.amount)}
        </p>
        <p className="text-xs text-[#0A0A0A]">
          Bal: {formatCurrency(tx.balance_after)}
        </p>
      </div>
    </div>
  );
}

/* ─── Vehicles section ─── */
function VehiclesSection() {
  const { refreshVehicles } = useSelectedVehicle();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  async function handleAdd(data: CreateVehicleInput) {
    const res = await fetch('/api/users/me/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add vehicle');
    toast('success', 'Vehicle added');
    setShowAdd(false);
    await Promise.all([fetchVehicles(), refreshVehicles()]);
  }

  async function handleEdit(data: CreateVehicleInput) {
    if (!editVehicle) return;
    const res = await fetch(`/api/users/me/vehicles/${editVehicle.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update vehicle');
    toast('success', 'Vehicle updated');
    setEditVehicle(null);
    await Promise.all([fetchVehicles(), refreshVehicles()]);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/me/vehicles/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast('success', 'Vehicle removed');
      setDeleteTarget(null);
      await Promise.all([fetchVehicles(), refreshVehicles()]);
    } catch {
      toast('error', 'Failed to delete vehicle');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-marketing-display text-xl font-bold text-slate-900">My Vehicles</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-md bg-[#321A71] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a1a5e]"
        >
          <Plus className="h-4 w-4" />
          Add vehicle
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#0A0A0A]" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <Car className="h-8 w-8 text-slate-300" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">No vehicles saved</p>
            <p className="mt-1 text-xs text-[#0A0A0A]">
              Add your car to speed up ordering and see compatible parts
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 rounded-full bg-[#321A71] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a1a5e]"
            >
              Add your first vehicle
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
                    <Car className="h-6 w-6 text-[#0A0A0A]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {v.year} {v.make} {v.model}
                      </p>
                      {v.is_primary && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[v.nickname, v.spec].filter(Boolean).join(' · ') || 'No details'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setEditVehicle(v)}
                  className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-[#0A0A0A] transition-colors hover:bg-slate-50"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(v)}
                  className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Sheet */}
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Vehicle">
        <VehicleForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />
      </BottomSheet>

      {/* Edit Vehicle Sheet */}
      <BottomSheet
        isOpen={!!editVehicle}
        onClose={() => setEditVehicle(null)}
        title="Edit Vehicle"
      >
        {editVehicle && (
          <VehicleForm
            vehicle={editVehicle}
            onSubmit={handleEdit}
            onCancel={() => setEditVehicle(null)}
          />
        )}
      </BottomSheet>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Vehicle"
      >
        <p className="mb-4 text-sm text-[#0A0A0A]">
          Remove {deleteTarget?.year} {deleteTarget?.make} {deleteTarget?.model}? This
          action cannot be undone.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            fullWidth
            isLoading={isDeleting}
            onClick={handleDelete}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Shipping section ─── */
function ShippingSection({
  user,
}: {
  user: { profile: Record<string, unknown> };
}) {
  const [editing, setEditing] = useState(false);
  const { refresh } = useUser();
  const address = (user.profile?.delivery_address as string) || '';

  return (
    <div className="space-y-6">
      <h2 className="font-marketing-display text-xl font-bold text-slate-900">Shipping Address</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {editing ? (
          <ShippingEditForm
            currentAddress={address}
            onDone={() => {
              setEditing(false);
              refresh();
            }}
          />
        ) : address ? (
          <>
            {/* Map placeholder */}
            <div className="mb-4 h-36 overflow-hidden rounded-lg bg-slate-100">
              <div className="flex h-full w-full items-center justify-center">
                <MapPin className="h-8 w-8 text-slate-300" />
              </div>
            </div>

            <fieldset className="rounded-lg border border-slate-200 px-3 pb-3 pt-2">
              <legend className="px-1 text-xs text-[#0A0A0A]">Current address</legend>
              <p className="text-sm text-slate-900">{address}</p>
            </fieldset>

            <button
              onClick={() => setEditing(true)}
              className="mt-4 flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Change address
            </button>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <MapPin className="h-8 w-8 text-slate-300" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">
              No shipping address saved
            </p>
            <p className="mt-1 text-xs text-[#0A0A0A]">
              Add your delivery address so we can deliver to you faster
            </p>
            <button
              onClick={() => setEditing(true)}
              className="mt-4 rounded-full bg-[#321A71] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a1a5e]"
            >
              Add address
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ShippingEditForm({
  currentAddress,
  onDone,
}: {
  currentAddress: string;
  onDone: () => void;
}) {
  const [address, setAddress] = useState(currentAddress);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!address.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { delivery_address: address } }),
      });
      if (!res.ok) throw new Error('Failed');
      toast('success', 'Address updated');
      onDone();
    } catch {
      toast('error', 'Failed to update address');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <fieldset className="rounded-lg border border-slate-300 px-3 pb-3 pt-2">
        <legend className="px-1 text-xs text-slate-500">Delivery Address</legend>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          className="w-full resize-none bg-transparent text-sm text-slate-900 placeholder:text-[#0A0A0A] focus:outline-none"
          placeholder="Enter your full delivery address"
        />
      </fieldset>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onDone}
          className="flex-1 py-2.5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-slate-50"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!address.trim() || saving}
          className="flex-1 bg-[#321A71] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a1a5e] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save address'}
        </Button>
      </div>
    </div>
  );
}

function TrackOrdersSection() {
  const [orderId, setOrderId] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [recentOrders, setRecentOrders] = useState<OrderWithItems[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function loadRecent() {
      try {
        const res = await fetch('/api/orders?status=active&limit=5');
        if (!cancelled && res.ok) {
          const data = await res.json();
          setRecentOrders(data.orders || []);
        }
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    }
    void loadRecent();
    return () => { cancelled = true; };
  }, []);

  async function handleTrack() {
    if (!orderId.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`/api/orders?search=${encodeURIComponent(orderId.trim())}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders?.length > 0) {
          router.push(`/order/${data.orders[0].id}`);
          return;
        }
      }
      setError('Order not found. Check the order number and try again.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-marketing-display text-xl font-bold text-slate-900">Track Orders</h2>

      {/* Search card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#FF6600]" />
          <h3 className="font-marketing-display text-base font-bold text-slate-900">Find your order</h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Enter your order number to track delivery status
        </p>

        <div className="mt-4 flex gap-2">
          <fieldset className="flex-1 rounded-lg border border-slate-300 px-3 pb-2.5 pt-1.5">
            <legend className="px-1 text-xs text-slate-500">Order number</legend>
            <input
              type="text"
              placeholder="e.g. ORD-20250520-003"
              value={orderId}
              onChange={(e) => { setOrderId(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-[#0A0A0A] focus:outline-none"
            />
          </fieldset>
          <button
            type="button"
            onClick={handleTrack}
            disabled={!orderId.trim() || searching}
            className="shrink-0 self-end rounded-full bg-[#321A71] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a1a5e] disabled:opacity-50"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Track'
            )}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Active orders */}
      {loadingRecent ? (
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#0A0A0A]" />
        </div>
      ) : recentOrders.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-marketing-display mb-4 text-base font-bold text-slate-900">
            Active orders
          </h3>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/order/${order.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    #{order.order_number}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {order.order_items.map((i) => i.description).join(', ')}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <ChevronRight className="h-4 w-4 text-[#0A0A0A]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
              <Package className="h-7 w-7 text-slate-300" />
            </div>
            <p className="mt-3 text-sm text-slate-500">No active orders to track</p>
          </div>
        </div>
      )}
    </div>
  );
}

const ISSUE_REASONS = [
  'Wrong part',
  'Damaged/Defective',
  "Doesn't fit vehicle",
  'Not what I ordered',
  'Missing items',
  'Late delivery',
];

const MAX_FILE_SIZE_MB = 22.3;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function ReportSection({ user }: { user: { full_name: string; phone: string; email: string | null } }) {
  const [description, setDescription] = useState('');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveredOrders, setDeliveredOrders] = useState<OrderWithItems[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDeliveredOrders() {
      setOrdersLoading(true);
      try {
        const res = await fetch('/api/orders?status=delivered&limit=50');
        if (!cancelled && res.ok) {
          const data = await res.json();
          setDeliveredOrders(data.orders || []);
        }
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    }
    void loadDeliveredOrders();
    return () => { cancelled = true; };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      toast('error', `File must be under ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    setFile(selected);
    // Simulate upload progress
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setUploadProgress(progress);
    }, 200);
  }

  function removeFile() {
    setFile(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReason || !description.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast('success', 'Report submitted. We will get back to you soon.');
    }, 1000);
  }

  function resetForm() {
    setDescription('');
    setSelectedReason(null);
    setSelectedOrderId(null);
    setFile(null);
    setUploadProgress(null);
    setSubmitted(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  if (submitted) {
    return (
      <div>
        <h2 className="font-marketing-display mb-6 text-xl font-bold text-slate-900">Report an Issue</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-4 text-lg font-semibold text-slate-900">
              Report submitted
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Our team will review your report and get back to you.
            </p>
            <button
              onClick={resetForm}
              className="mt-5 text-sm font-medium text-[#FF6600] hover:underline"
            >
              Submit another report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-marketing-display mb-6 text-xl font-bold text-slate-900">Report a part problem</h2>

      <form onSubmit={handleSubmit} className="space-y-7">
        {/* Select order */}
        <fieldset className="relative rounded-lg border border-slate-300 px-3 pb-3 pt-2">
          <legend className="px-1 text-xs text-slate-500">Select order</legend>
          {ordersLoading ? (
            <div className="flex h-10 items-center">
              <Loader2 className="h-4 w-4 animate-spin text-[#0A0A0A]" />
              <span className="ml-2 text-sm text-[#0A0A0A]">Loading orders...</span>
            </div>
          ) : deliveredOrders.length === 0 ? (
            <p className="py-2 text-sm text-[#0A0A0A]">No delivered orders to report</p>
          ) : (
            <select
              value={selectedOrderId || ''}
              onChange={(e) => setSelectedOrderId(e.target.value || null)}
              className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
            >
              <option value="">Choose an order...</option>
              {deliveredOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} — {o.order_items.map((i) => i.description).join(', ').slice(0, 60)}
                  {o.order_items.map((i) => i.description).join(', ').length > 60 ? '...' : ''}
                </option>
              ))}
            </select>
          )}
        </fieldset>

        {/* Name + Email row */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <fieldset className="rounded-lg border border-slate-300 px-3 pb-3 pt-2">
            <legend className="px-1 text-xs text-slate-500">Name</legend>
            <input
              type="text"
              readOnly
              value={user.full_name}
              className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
            />
          </fieldset>
          <fieldset className="rounded-lg border border-slate-300 px-3 pb-3 pt-2">
            <legend className="px-1 text-xs text-slate-500">Email</legend>
            <input
              type="text"
              readOnly
              value={user.email || ''}
              className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
            />
          </fieldset>
        </div>

        {/* Phone number */}
        <fieldset className="rounded-lg border border-slate-300 px-3 pb-3 pt-2 sm:w-1/2">
          <legend className="px-1 text-xs text-slate-500">Phone number</legend>
          <input
            type="text"
            readOnly
            value={user.phone}
            className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
          />
        </fieldset>

        {/* Reason pills */}
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900">
            Reason for reporting an issue
          </p>
          <div className="flex flex-wrap gap-2">
            {ISSUE_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() =>
                  setSelectedReason(selectedReason === reason ? null : reason)
                }
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  selectedReason === reason
                    ? 'bg-orange-100 text-[#FF6600]'
                    : 'bg-slate-100 text-[#0A0A0A] hover:bg-slate-200 hover:text-[#0A0A0A]'
                )}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <fieldset className="rounded-lg border border-slate-300 px-3 pb-3 pt-2">
          <legend className="px-1 text-xs text-slate-500">Description</legend>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full resize-none bg-transparent text-sm text-slate-900 placeholder:text-[#0A0A0A] focus:outline-none"
            placeholder="Leave a description of what happened"
          />
        </fieldset>

        {/* File upload */}
        <fieldset className="rounded-lg border border-slate-300 px-3 pb-3 pt-2">
          <legend className="px-1 text-xs text-slate-500">
            Attach evidence (optional)
          </legend>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg bg-slate-50 py-8 transition-colors hover:bg-slate-100"
          >
            <CloudUpload className="h-8 w-8 text-[#321A71]" />
            <p className="mt-2 text-sm font-semibold text-slate-900">Upload file</p>
            <p className="mt-1 text-xs text-[#0A0A0A]">
              Must be {MAX_FILE_SIZE_MB}MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </fieldset>

        {/* Uploaded file progress */}
        {file && (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900">{file.name}</p>
              <button
                type="button"
                onClick={removeFile}
                className="text-[#0A0A0A] hover:text-[#0A0A0A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#FF6600] transition-all duration-300"
                  style={{ width: `${Math.min(uploadProgress ?? 0, 100)}%` }}
                />
              </div>
              <span className="shrink-0 text-xs text-[#0A0A0A]">
                {(file.size / (1024 * 1024)).toFixed(1)}MB
              </span>
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={!selectedReason || !description.trim() || isSubmitting}
          isLoading={isSubmitting}
          className=" bg-[#321A71] px-8 text-white hover:bg-[#2a1a5e]"
        >
          Submit report
        </Button>
      </form>
    </div>
  );
}

/* ─── Section label for breadcrumb ─── */
function getSectionLabel(section: Section): string {
  return SIDEBAR_ITEMS.find((s) => s.id === section)?.label || '';
}

/* ─── Main page ─── */
export default function AccountPage() {
  const { user, isLoading, needsSetup, refresh } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get('tab') as Section) || 'orders';
  const [activeSection, setActiveSection] = useState<Section>(initialSection);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsSetup) {
    return <SetupForm onComplete={refresh} />;
  }

  if (!user) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 px-4">
        <p className="text-slate-500">Please sign in to view your account</p>
        <Button onClick={() => router.push('/login')}>Sign In</Button>
      </div>
    );
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function handleSectionChange(section: Section) {
    setActiveSection(section);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', section);
    window.history.replaceState({}, '', url.toString());
  }

  return (
    <div className="px-4 pb-12 lg:px-0">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/dashboard' },
          { label: 'My Account', href: '/account' },
          { label: getSectionLabel(activeSection) },
        ]}
      />

      {/* Layout: sidebar + content */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Sidebar — mobile: horizontal scroll, desktop: sticky while content scrolls */}
        <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-56">
          {/* Mobile horizontal pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSectionChange(item.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    activeSection === item.id
                      ? 'bg-[#FF6600] text-white'
                      : 'bg-slate-100 text-[#0A0A0A] hover:bg-slate-200'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Desktop vertical nav */}
          <nav className="hidden lg:block">
            <div className="rounded-xl border border-slate-200 bg-white px-3">
              {SIDEBAR_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSectionChange(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                      idx < SIDEBAR_ITEMS.length - 1 && '',
                      activeSection === item.id
                        ? 'text-[#FF6600] bg-[#F5F5F5] rounded-lg'
                        : 'text-[#0A0A0A] hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        activeSection === item.id
                          ? 'text-[#FF6600]'
                          : 'text-[#0A0A0A]'
                      )}
                    />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Logout button below sidebar */}
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              Log Out
            </button>
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {activeSection === 'profile' && (
            <ProfileSection user={user} onLogout={handleLogout} />
          )}
          {activeSection === 'orders' && <OrdersSection />}
          {activeSection === 'wallet' && <WalletSection />}
          {activeSection === 'vehicles' && <VehiclesSection />}
          {activeSection === 'shipping' && <ShippingSection user={user} />}
          {activeSection === 'track' && <TrackOrdersSection />}
          {activeSection === 'report' && <ReportSection user={user} />}
        </div>
      </div>
    </div>
  );
}
