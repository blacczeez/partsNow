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
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

export const adminNavItems: AdminNavItem[] = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/orders', icon: Package, label: 'Orders' },
  { href: '/admin/runners', icon: Users, label: 'Runners' },
  { href: '/admin/riders', icon: Bike, label: 'Riders' },
  { href: '/admin/vendors', icon: Store, label: 'Vendors' },
  { href: '/admin/parts', icon: Wrench, label: 'Parts' },
  { href: '/admin/customers', icon: UserCircle, label: 'Customers' },
  { href: '/admin/payments', icon: Wallet, label: 'Payments' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export const adminAccountNavItem: AdminNavItem = {
  href: '/admin/account',
  icon: UserCircle,
  label: 'Account & log out',
};

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === '/admin/dashboard') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
