'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

const PRESET_AMOUNTS = [5000, 10000, 20000, 50000];

interface TopUpFormProps {
  onSubmit: (amount: number) => Promise<void>;
  isSubmitting?: boolean;
}

export function TopUpForm({ onSubmit, isSubmitting }: TopUpFormProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [error, setError] = useState('');

  function selectPreset(value: number) {
    setAmount(value);
    setError('');
  }

  function handleCustomChange(value: string) {
    const num = parseInt(value, 10);
    if (value === '') {
      setAmount('');
      setError('');
      return;
    }
    if (isNaN(num)) return;
    setAmount(num);
    if (num < 5000) setError('Minimum top-up is N5,000');
    else if (num > 500000) setError('Maximum top-up is N500,000');
    else setError('');
  }

  async function handleSubmit() {
    if (!amount || typeof amount !== 'number') {
      setError('Enter an amount');
      return;
    }
    if (amount < 5000 || amount > 500000) return;
    await onSubmit(amount);
  }

  return (
    <div className="space-y-4">
      {/* Preset Amounts */}
      <div className="grid grid-cols-2 gap-2">
        {PRESET_AMOUNTS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => selectPreset(preset)}
            className={cn(
              'rounded-card border py-3 text-sm font-medium transition-colors',
              amount === preset
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            )}
          >
            {formatCurrency(preset)}
          </button>
        ))}
      </div>

      {/* Custom Amount */}
      <Input
        label="Or enter amount"
        id="custom_amount"
        type="number"
        placeholder="Enter amount"
        value={amount === '' ? '' : String(amount)}
        onChange={(e) => handleCustomChange(e.target.value)}
        error={error}
      />

      {/* Submit */}
      <Button
        fullWidth
        onClick={handleSubmit}
        disabled={!amount || !!error}
        isLoading={isSubmitting}
      >
        {amount && typeof amount === 'number' && !error
          ? `Pay ${formatCurrency(amount)} with Paystack`
          : 'Top Up Wallet'}
      </Button>
    </div>
  );
}
