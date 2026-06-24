'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Scale,
  Search,
  ShieldAlert,
  Store,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/format';
import {
  NOTIFICATION_VARIANTS,
} from '@/lib/constants/admin-notifications';
import type {
  AdminNotificationGroup,
  AdminNotifications,
} from '@/lib/services/admin-notifications';

const NOTIFICATION_ICONS = {
  sla_breach: AlertTriangle,
  sourcing_escalated: Search,
  delivery_escalated: Truck,
  price_review: Scale,
  settlement_pending: Wallet,
  vendor_incident_pending: ShieldAlert,
  vendor_pending_activation: Store,
} as const;

interface AdminNotificationBellProps {
  onPendingVendorsChange?: (count: number) => void;
}

function NotificationGroupSection({ group }: { group: AdminNotificationGroup }) {
  const Icon = NOTIFICATION_ICONS[group.type];
  const variant = NOTIFICATION_VARIANTS[group.type];

  return (
    <section className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-start justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          <Icon
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0',
              variant === 'error'
                ? 'text-error'
                : variant === 'warning'
                  ? 'text-warning'
                  : 'text-info'
            )}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">{group.label}</p>
            <p className="text-xs text-slate-500">{group.description}</p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-pill px-2 py-0.5 text-xs font-semibold',
            variant === 'error'
              ? 'bg-red-100 text-red-800'
              : variant === 'warning'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-800'
          )}
        >
          {group.count}
        </span>
      </div>

      {group.items.length > 0 && (
        <ul className="pb-1">
          {group.items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block px-4 py-2.5 hover:bg-slate-50"
              >
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.title}
                </p>
                {(item.subtitle || item.createdAt) && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {[item.subtitle, item.createdAt ? formatRelativeTime(item.createdAt) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {group.hasMore && (
        <Link
          href={group.viewAllHref}
          className="flex items-center justify-center gap-1 px-4 py-2 text-xs font-medium text-primary hover:bg-slate-50"
        >
          View all {group.count}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}

export function AdminNotificationBell({ onPendingVendorsChange }: AdminNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AdminNotifications | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (!res.ok) return;
      const json = (await res.json()) as AdminNotifications;
      setData(json);
      onPendingVendorsChange?.(json.pendingVendors ?? 0);
    } catch {
      // Non-critical
    }
  }, [onPendingVendorsChange]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/admin/notifications');
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as AdminNotifications;
        if (!cancelled) {
          setData(json);
          onPendingVendorsChange?.(json.pendingVendors ?? 0);
        }
      } catch {
        // Non-critical
      }
    }

    void load();
    const interval = setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [onPendingVendorsChange]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={
          totalCount > 0
            ? `${totalCount} notifications`
            : 'Notifications'
        }
        aria-expanded={open}
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) void refreshNotifications();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-button text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">
                {totalCount > 0
                  ? `${totalCount} item${totalCount === 1 ? '' : 's'} need attention`
                  : 'All caught up'}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
              className="rounded-button p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!data ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Loading notifications…
            </div>
          ) : data.groups.length > 0 ? (
            <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
              {data.groups.map((group) => (
                <NotificationGroupSection key={group.type} group={group} />
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No open items right now.
            </div>
          )}

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <Link
              href="/admin/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Open dashboard overview
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
