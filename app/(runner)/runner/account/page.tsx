import { StaffAccountView } from '@/components/account/staff-account-view';
import { RunnerLogoutButton } from '@/components/runner/runner-logout-button';

export default function RunnerAccountPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Account</h1>
      <StaffAccountView roleLabel="Runner" logoutButton={<RunnerLogoutButton />} />
    </div>
  );
}
