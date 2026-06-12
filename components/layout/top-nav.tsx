'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingCart, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface RoleBadge {
  label: string;
  className: string;
}

interface TopNavProps {
  items: NavItem[];
  roleBadge?: RoleBadge;
  accountHref?: string;
  showSearch?: boolean;
  showWalletBadge?: boolean;
  showCartBadge?: boolean;
  cartCount?: number;
  walletBalance?: number;
}

export function TopNav({
  items,
  roleBadge,
  accountHref = '/account',
  showSearch,
  showWalletBadge,
  showCartBadge,
  cartCount = 0,
  walletBalance = 0,
}: TopNavProps) {
  const pathname = usePathname();

  // Filter out "Account" from nav tabs — it's in row 1 as avatar
  const tabItems = items.filter(
    (item) => item.label.toLowerCase() !== 'account'
  );

  return (
    <div className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white shadow-sm lg:block">
      {/* Row 1 — Brand Bar */}
      <div className="border-b border-slate-100">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-6">
          {/* Left: Logo + role badge */}
          <Link href={items[0]?.href ?? '/'} className="flex shrink-0 items-center gap-2">
            <span className="text-lg font-bold text-primary">PartsNow</span>
            {roleBadge && (
              <span
                className={cn(
                  'rounded-pill px-2 py-0.5 text-xs font-medium',
                  roleBadge.className
                )}
              >
                {roleBadge.label}
              </span>
            )}
          </Link>

          {/* Center: Search bar (customer only) */}
          {showSearch && (
            <Link
              href="/search"
              className="mx-4 flex min-w-0 flex-1 items-center gap-2 rounded-button bg-slate-50 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-white hover:ring-1 hover:ring-slate-200"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search spare parts...</span>
            </Link>
          )}

          {/* Spacer when no search */}
          {!showSearch && <div className="flex-1" />}

          {/* Right: Cart, Wallet, Account */}
          <div className="flex shrink-0 items-center gap-3">
            {showCartBadge && (
              <Link
                href="/cart"
                className="relative rounded-button p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {showWalletBadge && (
              <Link
                href="/wallet"
                className="flex items-center gap-1.5 rounded-button px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Wallet className="h-4 w-4" />
                <span className="font-medium">
                  {formatCurrency(walletBalance)}
                </span>
              </Link>
            )}

            <Link
              href={accountHref}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                pathname.startsWith(accountHref)
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              )}
            >
              <User className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2 — Nav Tabs */}
      <div>
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-1 px-6">
          {tabItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              pathname === href ||
              (href !== '/' && pathname.startsWith(href)) ||
              (href === '/orders' && pathname.startsWith('/order/'));

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
