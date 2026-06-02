'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  LogOut,
  Car,
  Wallet,
  Award,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { useUser } from '@/lib/hooks/use-user';
import {
  updateProfileSchema,
  setupProfileSchema,
  type UpdateProfileInput,
  type SetupProfileInput,
} from '@/lib/validators/user';
import { formatPhone } from '@/lib/utils/format';
import Link from 'next/link';

function SetupForm({ phone, onComplete }: { phone?: string; onComplete: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupProfileInput>({
    resolver: zodResolver(setupProfileSchema),
  });

  async function onSubmit(data: SetupProfileInput) {
    try {
      const res = await fetch('/api/users/me/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Setup failed');
      }
      toast('success', 'Profile created!');
      onComplete();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Complete Your Profile</h1>
      <p className="mb-6 text-sm text-slate-500">
        {phone ? `Signed in as ${formatPhone(phone)}` : 'Set up your account to start ordering'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          id="full_name"
          placeholder="John Doe"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
        <Input
          label="Email (optional)"
          id="email"
          type="email"
          placeholder="john@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Delivery Address"
          id="delivery_address"
          placeholder="123 Main Street, Ikeja, Lagos"
          error={errors.delivery_address?.message}
          {...register('delivery_address')}
        />
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Continue
        </Button>
      </form>
    </div>
  );
}

function EditProfileForm({
  user,
  onDone,
}: {
  user: { full_name: string; email: string | null; profile: Record<string, unknown> };
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      full_name: user.full_name,
      email: user.email || '',
      profile: {
        delivery_address: (user.profile?.delivery_address as string) || '',
      },
    },
  });

  async function onSubmit(data: UpdateProfileInput) {
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Update failed');
      toast('success', 'Profile updated');
      onDone();
    } catch {
      toast('error', 'Failed to update profile');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 py-4">
      <Input
        label="Full Name"
        id="edit_full_name"
        error={errors.full_name?.message}
        {...register('full_name')}
      />
      <Input
        label="Email"
        id="edit_email"
        type="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Delivery Address"
        id="edit_delivery_address"
        error={errors.profile?.delivery_address?.message}
        {...register('profile.delivery_address')}
      />
      <div className="flex gap-3">
        <Button type="button" variant="secondary" fullWidth onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Save
        </Button>
      </div>
    </form>
  );
}

const tierColors: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  new: 'default',
  verified: 'primary',
  trusted: 'success',
  partner: 'warning',
};

export default function AccountPage() {
  const { user, wallet, isLoading, needsSetup, refresh } = useUser();
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsSetup) {
    return <SetupForm onComplete={refresh} />;
  }

  if (!user) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 px-4">
        <p className="text-slate-500">Please sign in to view your account</p>
        <Button onClick={() => router.push('/login')}>Sign In</Button>
      </div>
    );
  }

  if (editing) {
    return (
      <EditProfileForm
        user={user}
        onDone={() => {
          setEditing(false);
          refresh();
        }}
      />
    );
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-primary px-4 pb-8 pt-6 lg:rounded-b-2xl">
        <h1 className="mb-4 text-xl font-bold text-white">Account</h1>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-white">{user.full_name}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={tierColors[user.loyalty_tier] || 'default'}>
                {user.loyalty_tier.charAt(0).toUpperCase() + user.loyalty_tier.slice(1)}
              </Badge>
              <span className="text-sm text-blue-200">
                {user.total_orders} order{user.total_orders !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-1 border-b border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center gap-3 py-2">
          <Phone className="h-5 w-5 text-slate-400" />
          <span className="text-sm text-slate-700">{formatPhone(user.phone)}</span>
        </div>
        {user.email && (
          <div className="flex items-center gap-3 py-2">
            <Mail className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-700">{user.email}</span>
          </div>
        )}
        {(user.profile as Record<string, unknown>)?.delivery_address ? (
          <div className="flex items-center gap-3 py-2">
            <MapPin className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-700">
              {String((user.profile as Record<string, unknown>).delivery_address)}
            </span>
          </div>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setEditing(true)}
        >
          Edit Profile
        </Button>
      </div>

      {/* Navigation Links */}
      <div className="mt-2 bg-white">
        <Link
          href="/account/vehicles"
          className="flex items-center justify-between border-b border-slate-100 px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <Car className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">My Vehicles</span>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
        <Link
          href="/wallet"
          className="flex items-center justify-between border-b border-slate-100 px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Wallet</span>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
        <Link
          href="/orders"
          className="flex items-center justify-between border-b border-slate-100 px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              Loyalty: {user.loyalty_tier.charAt(0).toUpperCase() + user.loyalty_tier.slice(1)} Tier
            </span>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
      </div>

      {/* Logout */}
      <div className="mt-2 bg-white">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-4 text-error"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
}
