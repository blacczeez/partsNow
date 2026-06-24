'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ActivateVendorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName: string;
  defaultLocation?: string | null;
  onConfirm: (data: {
    contact_phone: string;
    location_in_market?: string;
    notes?: string;
  }) => Promise<boolean>;
  isLoading?: boolean;
}

export function ActivateVendorSheet({
  isOpen,
  onClose,
  vendorName,
  defaultLocation,
  onConfirm,
  isLoading,
}: ActivateVendorSheetProps) {
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState(defaultLocation ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Phone number is required to activate');
      return;
    }
    setError('');
    const ok = await onConfirm({
      contact_phone: phone.trim(),
      location_in_market: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    if (ok) {
      setPhone('');
      setNotes('');
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Activate vendor">
      <p className="mb-4 text-sm text-slate-600">
        Runner added <span className="font-medium text-slate-900">{vendorName}</span>.
        Add contact details to activate for the directory.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Contact phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="08012345678"
        />
        <Input
          label="Location in market"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit" fullWidth isLoading={isLoading}>
          Activate vendor
        </Button>
      </form>
    </BottomSheet>
  );
}
