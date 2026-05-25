'use client';

import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useUser } from '@/lib/hooks/use-user';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function AddressInput({ value, onChange, error }: AddressInputProps) {
  const { user } = useUser();
  const savedAddress = (user?.profile as Record<string, unknown>)
    ?.delivery_address as string | undefined;

  return (
    <div className="space-y-2">
      <Input
        label="Delivery Address"
        id="delivery_address"
        placeholder="Enter your delivery address"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
      />
      {savedAddress && savedAddress !== value && (
        <button
          type="button"
          onClick={() => onChange(savedAddress)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary"
        >
          <MapPin className="h-3 w-3" />
          Use saved address
        </button>
      )}
    </div>
  );
}
