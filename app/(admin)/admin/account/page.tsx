'use client';

import { UserProvider } from '@/lib/hooks/use-user';
import { StaffAccountView } from '@/components/account/staff-account-view';

export default function AdminAccountPage() {
  return (
    <UserProvider>
      <div className="mx-auto max-w-lg p-6">
        <h1 className="mb-4 text-xl font-bold text-slate-900">Account</h1>
        <StaffAccountView roleLabel="Admin" />
      </div>
    </UserProvider>
  );
}
