import { StaffAccountView } from '@/components/account/staff-account-view';

export default function RiderAccountPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Account</h1>
      <StaffAccountView roleLabel="Rider" />
    </div>
  );
}
