'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isValidNigerianPhone } from '@/lib/utils/validation';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!isValidNigerianPhone(phone)) {
      setError('Enter a valid Nigerian phone number');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send OTP');
        return;
      }

      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">PartsNow</h1>
        <p className="mt-2 text-slate-600">
          Spare parts delivered in 45 minutes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Input
            id="phone"
            type="tel"
            label="Phone Number"
            placeholder="0801 234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={error}
          />
          <Phone className="absolute right-3 top-9 h-5 w-5 text-slate-400" />
        </div>

        <Button type="submit" fullWidth isLoading={isLoading}>
          Continue
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        We&apos;ll send a verification code to your phone
      </p>
    </div>
  );
}
