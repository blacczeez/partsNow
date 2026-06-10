import { AdminShell } from '@/components/layout/admin-shell';
import { AdminPageSkeleton } from '@/components/admin/admin-page-skeleton';
import { Suspense } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminShell>
      <Suspense fallback={<AdminPageSkeleton tableColumns={5} showFilters />}>
        {children}
      </Suspense>
    </AdminShell>
  );
}
