'use client';

import { Loader2, LogOut, Phone, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/lib/hooks/use-logout';
import { useUser } from '@/lib/hooks/use-user';
import { formatPhone } from '@/lib/utils/format';

interface StaffAccountViewProps {
  roleLabel: string;
}

export function StaffAccountView({ roleLabel }: StaffAccountViewProps) {
  const { user, isLoading } = useUser();
  const { logout, isLoggingOut } = useLogout();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Could not load your profile.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <UserIcon className="h-7 w-7 text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user.full_name}</p>
            <p className="text-sm text-slate-500">{roleLabel}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
          <Phone className="h-5 w-5 text-slate-400" />
          <span className="text-sm text-slate-700">{formatPhone(user.phone)}</span>
        </div>
      </div>

      <Button
        variant="destructive"
        fullWidth
        isLoading={isLoggingOut}
        onClick={() => logout()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </Button>
    </div>
  );
}
