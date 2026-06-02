'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface SideNavProps {
  items: NavItem[];
  brandLabel?: string;
  brandColor?: string;
}

export function SideNav({ items, brandLabel, brandColor }: SideNavProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-14 items-center border-b border-slate-200 px-6">
        <span className="text-lg font-bold text-primary">PartsNow</span>
        {brandLabel && (
          <span
            className={cn(
              'ml-2 rounded-pill px-2 py-0.5 text-xs font-medium',
              brandColor || 'bg-primary/10 text-primary'
            )}
          >
            {brandLabel}
          </span>
        )}
      </div>
      <nav className="p-4">
        <ul className="space-y-1">
          {items.map(({ href, icon: Icon, label }) => {
            const isActive =
              pathname === href ||
              (href !== '/' && pathname.startsWith(href));

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
