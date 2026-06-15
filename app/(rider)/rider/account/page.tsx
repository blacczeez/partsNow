import { StaffAccountView } from '@/components/account/staff-account-view';
import { RiderLogoutButton } from '@/components/rider/rider-logout-button';

export default function RiderAccountPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Account</h1>
      <StaffAccountView roleLabel="Rider" logoutButton={<RiderLogoutButton />} />
    </div>
  );
}
