'use client';

import { Wallet, CreditCard, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

type PaymentMethod = 'wallet' | 'card' | 'cod';

interface PaymentMethodSelectProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  walletBalance?: number;
  codAllowed: boolean;
  total: number;
}

export function PaymentMethodSelect({
  value,
  onChange,
  walletBalance = 0,
  codAllowed,
  total,
}: PaymentMethodSelectProps) {
  const walletSufficient = walletBalance >= total;

  const methods: Array<{
    id: PaymentMethod;
    label: string;
    description: string;
    icon: React.ReactNode;
    disabled: boolean;
    disabledReason?: string;
  }> = [
    {
      id: 'wallet',
      label: 'Wallet',
      description: walletSufficient
        ? `Balance: ${formatCurrency(walletBalance)}`
        : `Insufficient balance (${formatCurrency(walletBalance)})`,
      icon: <Wallet className="h-5 w-5" />,
      disabled: !walletSufficient,
      disabledReason: !walletSufficient ? 'Insufficient balance' : undefined,
    },
    {
      id: 'card',
      label: 'Card',
      description: 'Pay with debit/credit card',
      icon: <CreditCard className="h-5 w-5" />,
      disabled: false,
    },
    {
      id: 'cod',
      label: 'Cash on Delivery',
      description: codAllowed
        ? 'Pay when your parts arrive'
        : 'Not available for this order',
      icon: <Banknote className="h-5 w-5" />,
      disabled: !codAllowed,
      disabledReason: !codAllowed ? 'Order exceeds COD limit' : undefined,
    },
  ];

  return (
    <div className="space-y-2">
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => !method.disabled && onChange(method.id)}
          disabled={method.disabled}
          className={cn(
            'flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left transition-colors',
            value === method.id && !method.disabled
              ? 'border-primary bg-primary/5'
              : method.disabled
                ? 'border-slate-100 bg-slate-50 opacity-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
          )}
        >
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              value === method.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
            )}
          >
            {method.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{method.label}</p>
            <p
              className={cn(
                'text-xs',
                method.disabled ? 'text-error' : 'text-slate-500'
              )}
            >
              {method.disabledReason || method.description}
            </p>
          </div>
          <div
            className={cn(
              'h-5 w-5 shrink-0 rounded-full border-2',
              value === method.id
                ? 'border-primary bg-primary'
                : 'border-slate-300'
            )}
          >
            {value === method.id && (
              <div className="flex h-full items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
