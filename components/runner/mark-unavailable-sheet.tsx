'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';

interface MarkUnavailableSheetProps {
  isOpen: boolean;
  onClose: () => void;
  itemDescription: string;
  onSubmit: (reason: string) => Promise<void>;
}

export function MarkUnavailableSheet({
  isOpen,
  onClose,
  itemDescription,
  onSubmit,
}: MarkUnavailableSheetProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(reason.trim());
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Mark as Unavailable">
      <p className="mb-4 text-sm text-slate-600">{itemDescription}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="unavailable-reason"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Reason
          </label>
          <textarea
            id="unavailable-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this part unavailable?"
            maxLength={500}
            rows={3}
            className="w-full rounded-button border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
        </div>

        <Button
          type="submit"
          variant="destructive"
          fullWidth
          isLoading={isSubmitting}
        >
          Confirm Unavailable
        </Button>
      </form>
    </BottomSheet>
  );
}
