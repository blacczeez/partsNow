'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  adminAccountNavItem,
  adminNavItems,
  isAdminNavActive,
  type AdminNavItem,
} from '@/components/layout/admin-nav-config';

function AdminBrandMark() {
  return (
    <>
      <span className="text-lg font-bold text-primary">PartsNow</span>
      <span className="ml-2 rounded-pill bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        Admin
      </span>
    </>
  );
}

function AdminBrandHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-14 shrink-0 items-center border-b border-slate-200 px-6',
        className
      )}
    >
      <AdminBrandMark />
    </div>
  );
}

function AdminNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isAdminNavActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-slate-400')} />
      {item.label}
    </Link>
  );
}

function AdminNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="p-4">
      <ul className="space-y-1">
        {adminNavItems.map((item) => (
          <li key={item.href}>
            <AdminNavLink item={item} pathname={pathname} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      <div className="mt-8 border-t border-slate-200 pt-4">
        <AdminNavLink item={adminAccountNavItem} pathname={pathname} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMobileNav();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <AdminBrandHeader />
        <div className="scrollbar-subtle flex-1 overflow-y-auto overscroll-contain">
          <AdminNav pathname={pathname} />
        </div>
      </aside>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={closeMobileNav}
          />
          <aside className="relative flex h-full w-[min(100%,18rem)] flex-col bg-white shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
              <AdminBrandMark />
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeMobileNav}
                className="flex h-9 w-9 items-center justify-center rounded-button text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="scrollbar-subtle flex-1 overflow-y-auto overscroll-contain">
              <AdminNav pathname={pathname} onNavigate={closeMobileNav} />
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-button text-slate-600 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {adminNavItems.find((item) => isAdminNavActive(pathname, item.href))?.label ??
                (isAdminNavActive(pathname, adminAccountNavItem.href)
                  ? adminAccountNavItem.label
                  : 'Admin')}
            </p>
          </div>
        </header>

        <main className="scrollbar-subtle flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
