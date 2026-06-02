'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/orders', icon: Package, label: 'Orders' },
  { href: '/account', icon: User, label: 'Account' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white pb-safe lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            pathname === href ||
            (href !== '/' && pathname.startsWith(href)) ||
            (href === '/orders' && pathname.startsWith('/order/'));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex h-full w-full flex-col items-center justify-center gap-1',
                isActive ? 'text-primary' : 'text-slate-400'
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
