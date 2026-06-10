import Link from 'next/link';
import {
  BarChart3,
  Package,
  Users,
  Store,
  Bike,
  Wallet,
  Settings,
  LayoutDashboard,
  UserCircle,
  Wrench,
} from 'lucide-react';

const sidebarItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/orders', icon: Package, label: 'Orders' },
  { href: '/admin/runners', icon: Users, label: 'Runners' },
  { href: '/admin/riders', icon: Bike, label: 'Riders' },
  { href: '/admin/vendors', icon: Store, label: 'Vendors' },
  { href: '/admin/parts', icon: Wrench, label: 'Parts' },
  { href: '/admin/customers', icon: Users, label: 'Customers' },
  { href: '/admin/payments', icon: Wallet, label: 'Payments' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-14 items-center border-b border-slate-200 px-6">
          <span className="text-lg font-bold text-primary">PartsNow</span>
          <span className="ml-2 rounded-pill bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Admin
          </span>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {sidebarItems.map(({ href, icon: Icon, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 border-t border-slate-200 pt-4">
            <Link
              href="/admin/account"
              className="flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <UserCircle className="h-5 w-5" />
              Account &amp; log out
            </Link>
          </div>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
