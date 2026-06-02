'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils/format';

interface FloatTopupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  runnerName: string;
  currentBalance: number;
  onConfirm: (amount: number) => Promise<boolean>;
  isLoading?: boolean;
}

export function FloatTopupSheet({
  isOpen,
  onClose,
  runnerName,
  currentBalance,
  onConfirm,
  isLoading,
}: FloatTopupSheetProps) {
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const success = await onConfirm(numAmount);
    if (success) {
      setAmount('');
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Top Up Runner Float">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-button bg-slate-50 p-3">
          <p className="text-sm text-slate-500">Runner</p>
          <p className="font-medium text-slate-900">{runnerName}</p>
          <p className="mt-1 text-sm text-slate-500">
            Current Balance: <span className="font-medium text-slate-700">{formatCurrency(currentBalance)}</span>
          </p>
        </div>
        <Input
          label="Amount (NGN)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 50000"
          min="1"
          required
        />
        {amount && parseFloat(amount) > 0 && (
          <p className="text-sm text-slate-500">
            New Balance: <span className="font-medium text-slate-700">{formatCurrency(currentBalance + parseFloat(amount))}</span>
          </p>
        )}
        <Button type="submit" fullWidth isLoading={isLoading} disabled={!amount || parseFloat(amount) <= 0}>
          Confirm Top Up
        </Button>
      </form>
    </BottomSheet>
  );
}
