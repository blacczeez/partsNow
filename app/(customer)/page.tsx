'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  Zap,
  Truck,
  Shield,
  Clock,
  Wrench,
  Wallet,
  Loader2,
  Disc,
  Cog,
  Gauge,
  Lightbulb,
  Droplets,
  Wind,
  CarFront,
  Cable,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/lib/hooks/use-user';
import { useRecentOrders } from '@/lib/hooks/use-recent-orders';
import { OrderCard } from '@/components/orders/order-card';
import { formatCurrency } from '@/lib/utils/format';
import { LandingPage } from '@/components/landing/landing-page';

const categoryIcons: Record<string, { icon: LucideIcon; bg: string }> = {
  brakes: { icon: Disc, bg: 'bg-red-100 text-red-600' },
  engine: { icon: Cog, bg: 'bg-blue-100 text-blue-600' },
  suspension: { icon: Gauge, bg: 'bg-purple-100 text-purple-600' },
  electrical: { icon: Lightbulb, bg: 'bg-amber-100 text-amber-600' },
  'oil-fluids': { icon: Droplets, bg: 'bg-green-100 text-green-600' },
  cooling: { icon: Wind, bg: 'bg-cyan-100 text-cyan-600' },
  body: { icon: CarFront, bg: 'bg-slate-200 text-slate-600' },
  transmission: { icon: Cable, bg: 'bg-orange-100 text-orange-600' },
};

const defaultCategoryStyle = { icon: Wrench, bg: 'bg-primary/10 text-primary' };

function Dashboard() {
  const { user, wallet } = useUser();
  const { orders, isLoading: ordersLoading } = useRecentOrders(3);
  const [categories, setCategories] = useState<
    Array<{ slug: string; name: string; part_count: number }>
  >([]);

  useEffect(() => {
    fetch('/api/inventory/categories')
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setCategories(
            (data.categories ?? []).filter(
              (c: { part_count: number }) => c.part_count > 0
            )
          );
        }
      })
      .catch(() => setCategories([]));
  }, []);

  const firstName = user?.full_name?.split(' ')[0];

  return (
    <div>
      {/* Header */}
      <div className="bg-primary px-4 pb-8 pt-6 lg:rounded-b-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-200">
              {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
            </p>
            <h1 className="text-xl font-bold text-white">PartsNow</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Search Bar */}
        <Link href="/search">
          <div className="flex items-center gap-3 rounded-card bg-white px-4 py-3 shadow-md">
            <Search className="h-5 w-5 text-slate-400" />
            <span className="text-slate-400">Search for spare parts...</span>
          </div>
        </Link>
      </div>

      {/* Wallet Quick View */}
      {wallet && (
        <div className="px-4 pt-4">
          <Link href="/wallet">
            <div className="flex items-center justify-between rounded-card border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Wallet className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Wallet Balance</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(wallet.balance)}
                  </p>
                </div>
              </div>
              <span className="text-sm font-medium text-primary">Top Up</span>
            </div>
          </Link>
        </div>
      )}

      {/* Value Props */}
      <div className="flex gap-4 overflow-x-auto px-4 py-4 lg:flex-wrap">
        <div className="flex min-w-fit items-center gap-2 rounded-pill bg-green-50 px-3 py-1.5">
          <Clock className="h-4 w-4 text-success" />
          <span className="text-xs font-medium text-green-800">45-min delivery</span>
        </div>
        <div className="flex min-w-fit items-center gap-2 rounded-pill bg-blue-50 px-3 py-1.5">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-blue-800">Quality checked</span>
        </div>
        <div className="flex min-w-fit items-center gap-2 rounded-pill bg-orange-50 px-3 py-1.5">
          <Truck className="h-4 w-4 text-secondary" />
          <span className="text-xs font-medium text-orange-800">Free above N50k</span>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Categories</h2>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-6 xl:grid-cols-8">
          {categories.map(({ name, slug }) => {
            const style = categoryIcons[slug] ?? defaultCategoryStyle;
            const Icon = style.icon;
            return (
              <Link
                key={slug}
                href={`/search?category=${slug}`}
                className="flex flex-col items-center gap-2 rounded-card border border-slate-200 bg-white p-3 shadow-sm hover:border-primary/30 hover:shadow-md"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${style.bg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-center text-xs font-medium text-slate-700">{name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
          <Link href="/orders" className="text-sm font-medium text-primary">
            View all
          </Link>
        </div>
        <div className="mt-3">
          {ordersLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center rounded-card border border-dashed border-slate-300 bg-white py-10">
              <Truck className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">Your first order is waiting</p>
              <p className="mt-1 text-xs text-slate-400">
                Search for a part to get started &mdash; delivery in 45 minutes
              </p>
              <Link
                href="/search"
                className="mt-4 rounded-button bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Find Parts
              </Link>
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
    </div>
  );
}

export default function HomePage() {
  const { user, isLoading } = useUser();

  if (isLoading) return null;
  if (!user) return <LandingPage />;

  return <Dashboard />;
}
