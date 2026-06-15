'use client';

import { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';
import type { LoyaltyTier, OrderStatus } from '@/lib/types/database';

interface CustomerDetailSheetProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CustomerDetail {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  user_type: string;
  loyalty_tier: LoyaltyTier;
  loyalty_tier_locked?: boolean;
  total_orders: number;
  lifetime_spend: number;
  is_active: boolean;
  created_at: string;
  wallet: { balance: number; held_balance: number } | null;
  recentOrders: Array<{
    id: string;
    order_number: string;
    status: string;
    total: number;
    created_at: string;
  }>;
}

const tierVariants: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'info'> = {
  new: 'default',
  verified: 'info',
  trusted: 'primary',
  partner: 'success',
};

const LOYALTY_TIERS: LoyaltyTier[] = ['new', 'verified', 'trusted', 'partner'];

export function CustomerDetailSheet({ customerId, isOpen, onClose }: CustomerDetailSheetProps) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tierDraft, setTierDraft] = useState<LoyaltyTier>('new');
  const [lockTier, setLockTier] = useState(true);
  const [isSavingTier, setIsSavingTier] = useState(false);

  useEffect(() => {
    if (!customerId || !isOpen) return;
    setIsLoading(true);
    fetch(`/api/admin/customers/${customerId}`)
      .then((r) => r.json())
      .then((data: CustomerDetail) => {
        setCustomer(data);
        setTierDraft(data.loyalty_tier);
        setLockTier(data.loyalty_tier_locked ?? false);
      })
      .finally(() => setIsLoading(false));
  }, [customerId, isOpen]);

  async function handleSaveLoyalty() {
    if (!customerId) return;
    setIsSavingTier(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/loyalty`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loyaltyTier: tierDraft, lockTier }),
      });
      if (!res.ok) throw new Error('Failed to update loyalty');
      toast('success', 'Loyalty tier updated');
      const refreshed = await fetch(`/api/admin/customers/${customerId}`).then((r) => r.json());
      setCustomer(refreshed);
    } catch {
      toast('error', 'Failed to update loyalty tier');
    } finally {
      setIsSavingTier(false);
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Customer Details">
      {isLoading || !customer ? (
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="h-16 rounded bg-slate-100" />
          <div className="h-16 rounded bg-slate-100" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Profile */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">{customer.full_name}</h3>
              <Badge variant={tierVariants[customer.loyalty_tier] || 'default'}>
                {customer.loyalty_tier}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">{customer.phone}</p>
            {customer.email && <p className="text-sm text-slate-500">{customer.email}</p>}
            <p className="mt-1 text-xs text-slate-400">
              Type: {customer.user_type} | Joined: {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="rounded-card border border-slate-200 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Loyalty tier</h4>
            <div className="flex flex-wrap items-end gap-2">
              <select
                value={tierDraft}
                onChange={(e) => setTierDraft(e.target.value as LoyaltyTier)}
                className="rounded-input border border-slate-300 px-3 py-2 text-sm"
              >
                {LOYALTY_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={lockTier}
                  onChange={(e) => setLockTier(e.target.checked)}
                />
                Lock tier (skip auto-promotion)
              </label>
              <Button size="sm" isLoading={isSavingTier} onClick={handleSaveLoyalty}>
                Save
              </Button>
            </div>
            {customer.loyalty_tier_locked && (
              <p className="mt-2 text-xs text-amber-700">Tier is manually locked</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-button bg-slate-50 p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{customer.total_orders}</p>
              <p className="text-xs text-slate-500">Orders</p>
            </div>
            <div className="rounded-button bg-slate-50 p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{formatCurrency(customer.lifetime_spend)}</p>
              <p className="text-xs text-slate-500">Spent</p>
            </div>
            <div className="rounded-button bg-slate-50 p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{formatCurrency(customer.wallet?.balance ?? 0)}</p>
              <p className="text-xs text-slate-500">Wallet</p>
            </div>
          </div>

          {customer.wallet && customer.wallet.held_balance > 0 && (
            <p className="text-xs text-slate-400">Held balance: {formatCurrency(customer.wallet.held_balance)}</p>
          )}

          {/* Recent Orders */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Recent Orders</h4>
            {customer.recentOrders.length === 0 ? (
              <p className="text-sm text-slate-500">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {customer.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-button bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{order.order_number}</p>
                      <p className="text-xs text-slate-400">{formatRelativeTime(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(order.total)}</span>
                      <StatusBadge status={order.status as OrderStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
