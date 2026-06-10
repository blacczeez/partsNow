'use client';

import { useState, useEffect } from 'react';
import { Loader2, Package } from 'lucide-react';
import { OrderCard } from '@/components/orders/order-card';
import { cn } from '@/lib/utils/cn';
import type { OrderWithItems } from '@/lib/types/database';

type Tab = 'active' | 'completed' | 'all';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
];

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function handleTabChange(nextTab: Tab) {
    if (nextTab === tab) return;
    setIsLoading(true);
    setTab(nextTab);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const params = new URLSearchParams({ limit: '20' });
        if (tab !== 'all') params.set('status', tab);

        const res = await fetch(`/api/orders?${params}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 pt-4 lg:top-[6.5rem]">
        <h1 className="mb-3 text-xl font-bold text-slate-900">My Orders</h1>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              className={cn(
                'flex-1 border-b-2 pb-2 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Package className="h-12 w-12 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {tab === 'active'
                ? 'No active orders'
                : tab === 'completed'
                  ? 'No completed orders'
                  : 'No orders yet'}
            </p>
            <p className="text-xs text-slate-400">
              Orders you place will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
