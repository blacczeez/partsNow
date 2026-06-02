'use client';

import { useState } from 'react';
import { Camera, AlertTriangle } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

interface DeliveryFailureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { reason: string; notes?: string; photoUrl?: string }) => Promise<void>;
}

const failureReasons = [
  { value: 'customer_unavailable', label: 'Customer Unavailable' },
  { value: 'customer_refused', label: 'Customer Refused' },
  { value: 'wrong_address', label: 'Wrong Address' },
  { value: 'other', label: 'Other' },
];

export function DeliveryFailureSheet({
  isOpen,
  onClose,
  onSubmit,
}: DeliveryFailureSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Photo must be under 5MB');
      return;
    }

    setPhotoFile(file);
    setSubmitError(null);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      setSubmitError('Please select a reason');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let photoUrl: string | undefined;

      if (photoFile) {
        const supabase = createClient();
        const fileName = `failure-${Date.now()}-${Math.random().toString(36).slice(2)}.${photoFile.name.split('.').pop()}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('delivery-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw new Error('Failed to upload photo');

        const { data: urlData } = supabase.storage
          .from('delivery-photos')
          .getPublicUrl(uploadData.path);

        photoUrl = urlData.publicUrl;
      }

      await onSubmit({
        reason: selectedReason,
        notes: notes.trim() || undefined,
        photoUrl,
      });

      handleClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to report issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason(null);
      setNotes('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setSubmitError(null);
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Report Issue">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          What went wrong with this delivery?
        </p>

        {/* Reason selection */}
        <div className="space-y-2">
          {failureReasons.map((reason) => (
            <button
              key={reason.value}
              type="button"
              onClick={() => setSelectedReason(reason.value)}
              className={cn(
                'w-full rounded-button border px-4 py-3 text-left text-sm transition-colors',
                selectedReason === reason.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              )}
            >
              {reason.label}
            </button>
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Add any additional details..."
            className="w-full rounded-input border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Optional photo */}
        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Evidence"
              className="h-32 w-full rounded-button border object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"
            >
              &times;
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500 hover:text-primary">
            <Camera className="h-4 w-4" />
            <span>Add photo evidence (optional)</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </label>
        )}

        {submitError && (
          <p className="text-sm text-error">{submitError}</p>
        )}

        <Button
          fullWidth
          variant="destructive"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!selectedReason}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Report Issue
        </Button>
      </div>
    </BottomSheet>
  );
}
