'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

const OTP_LENGTH = 6;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== '') && value) {
      handleVerify(newOtp.join(''));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      handleVerify(pasted);
    }
  }

  async function handleVerify(code: string) {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code. Please try again.');
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        return;
      }

      // New users have auth session but no row in public.users yet
      const meRes = await fetch('/api/users/me');
      const me = meRes.ok ? await meRes.json() : { needsSetup: true };

      router.push(me.homePath ?? (me.needsSetup ? '/account' : '/'));
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;

    try {
      await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      setResendCooldown(60);
    } catch {
      setError('Failed to resend code');
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Enter Code</h1>
        <p className="mt-2 text-sm text-slate-600">
          We sent a verification code to{' '}
          <span className="font-medium">{phone}</span>
        </p>
      </div>

      <div className="mb-6 flex justify-center gap-2" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-12 w-12 rounded-input border border-slate-300 text-center text-lg font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        ))}
      </div>

      {error && (
        <p className="mb-4 text-center text-sm text-error">{error}</p>
      )}

      <Button
        fullWidth
        isLoading={isLoading}
        onClick={() => handleVerify(otp.join(''))}
        disabled={otp.some((d) => d === '')}
      >
        Verify
      </Button>

      <div className="mt-6 text-center">
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="text-sm text-primary hover:underline disabled:text-slate-400 disabled:no-underline"
        >
          {resendCooldown > 0
            ? `Resend code in ${resendCooldown}s`
            : "Didn't receive the code? Resend"}
        </button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Enter Code</h1>
          <p className="mt-2 text-sm text-slate-600">Loading...</p>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
