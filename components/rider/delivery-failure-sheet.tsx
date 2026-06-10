'use client';

import { useState, useSyncExternalStore } from 'react';
import { Camera, AlertTriangle } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import {
  formatDeliveryFailureReason,
  requiresFailurePhoto,
  type DeliveryFailureReason,
} from '@/lib/constants/delivery-failure';

interface DeliveryFailureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isHighValue: boolean;
  deliveryRetryAfter?: string | null;
  onSubmit: (data: {
    reason: string;
    notes?: string;
    photoUrl?: string;
    latitude?: number;
    longitude?: number;
    callAttemptsMade?: number;
  }) => Promise<void>;
}

const failureReasons: Array<{ value: DeliveryFailureReason; label: string }> = [
  { value: 'customer_unavailable', label: 'Customer Unavailable' },
  { value: 'customer_refused', label: 'Customer Refused' },
  { value: 'wrong_address', label: 'Wrong Address' },
  { value: 'other', label: 'Other' },
];

function computeRetryRemainingMs(retryAfter: string | null | undefined): number {
  if (!retryAfter) return 0;
  return Math.max(0, new Date(retryAfter).getTime() - Date.now());
}

function subscribeToSecondTick(onStoreChange: () => void): () => void {
  const id = setInterval(onStoreChange, 1000);
  return () => clearInterval(id);
}

function buildFailurePhotoFileName(originalName: string): string {
  const extension = originalName.split('.').pop() ?? 'jpg';
  return `failure-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
}

export function DeliveryFailureSheet({
  isOpen,
  onClose,
  isHighValue,
  deliveryRetryAfter,
  onSubmit,
}: DeliveryFailureSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<DeliveryFailureReason | null>(null);
  const [notes, setNotes] = useState('');
  const [callAttempts, setCallAttempts] = useState(1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const waitRemainingMs = useSyncExternalStore(
    (onStoreChange) =>
      deliveryRetryAfter ? subscribeToSecondTick(onStoreChange) : () => {},
    () => computeRetryRemainingMs(deliveryRetryAfter),
    () => 0
  );

  const photoRequired =
    selectedReason !== null &&
    requiresFailurePhoto(selectedReason, isHighValue, true);

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

  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => resolve(null),
        { timeout: 8000, maximumAge: 60000 }
      );
    });
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      setSubmitError('Please select a reason');
      return;
    }

    if (waitRemainingMs > 0) {
      setSubmitError('Please wait before reporting another attempt');
      return;
    }

    if (photoRequired && !photoFile) {
      setSubmitError('Photo evidence is required for this reason');
      return;
    }

    if (selectedReason === 'customer_unavailable' && callAttempts < 1) {
      setSubmitError('Log at least one call attempt');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let photoUrl: string | undefined;

      if (photoFile) {
        const supabase = createClient();
        const fileName = buildFailurePhotoFileName(photoFile.name);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('delivery-photos')
          .upload(fileName, photoFile);

        if (uploadError) {
          throw new Error(uploadError.message || 'Failed to upload photo');
        }

        const { data: urlData } = supabase.storage
          .from('delivery-photos')
          .getPublicUrl(uploadData.path);

        photoUrl = urlData.publicUrl;
      }

      const location = await getLocation();

      await onSubmit({
        reason: selectedReason,
        notes: notes.trim() || undefined,
        photoUrl,
        latitude: location?.latitude,
        longitude: location?.longitude,
        callAttemptsMade:
          selectedReason === 'customer_unavailable' ? callAttempts : undefined,
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
      setCallAttempts(1);
      setPhotoFile(null);
      setPhotoPreview(null);
      setSubmitError(null);
      onClose();
    }
  };

  const waitMinutes = Math.ceil(waitRemainingMs / 60000);

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Report Issue">
      <div className="space-y-4">
        {waitRemainingMs > 0 && (
          <div className="rounded-button border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Wait {waitMinutes} minute(s) before reporting another delivery attempt.
          </div>
        )}

        <p className="text-sm text-slate-600">
          What went wrong with this delivery?
        </p>

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

        {selectedReason === 'customer_unavailable' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Call attempts made to customer
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={callAttempts}
              onChange={(e) => setCallAttempts(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-input border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

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
            <span>
              {photoRequired ? 'Photo evidence (required)' : 'Add photo evidence (optional)'}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </label>
        )}

        {selectedReason && (
          <p className="text-xs text-slate-500">
            Reporting: {formatDeliveryFailureReason(selectedReason)}
          </p>
        )}

        {submitError && (
          <p className="text-sm text-error">{submitError}</p>
        )}

        <Button
          fullWidth
          variant="destructive"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!selectedReason || waitRemainingMs > 0}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Report Issue
        </Button>
      </div>
    </BottomSheet>
  );
}
