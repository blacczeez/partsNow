'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Package, User, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface BottomNavProps {
  cartCount?: number;
}

const navItems: NavItem[] = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/cart', icon: ShoppingCart, label: 'Cart' },
  { href: '/orders', icon: Package, label: 'Orders' },
  { href: '/account', icon: User, label: 'Account' },
];

export function BottomNav({ cartCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white pb-safe lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            pathname === href ||
            (href !== '/' && pathname.startsWith(href)) ||
            (href === '/orders' && pathname.startsWith('/order/'));

          const isCart = href === '/cart';

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex h-full w-full flex-col items-center justify-center gap-0.5',
                isActive ? 'text-primary' : 'text-slate-400'
              )}
            >
              <span className="relative">
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2 : 1.5} />
                {isCart && cartCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
