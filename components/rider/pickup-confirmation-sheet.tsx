'use client';

import { useState } from 'react';
import { Camera, CheckCircle } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface PickupConfirmationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isHighValue: boolean;
  onSubmit: (pickupPhotoUrl?: string) => Promise<void>;
}

export function PickupConfirmationSheet({
  isOpen,
  onClose,
  isHighValue,
  onSubmit,
}: PickupConfirmationSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be under 5MB');
      return;
    }

    setPhotoFile(file);
    setPhotoError(null);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (isHighValue && !photoFile) {
      setPhotoError('Photo is required for high-value orders');
      return;
    }

    setIsSubmitting(true);
    try {
      let photoUrl: string | undefined;

      if (photoFile) {
        const supabase = createClient();
        const fileName = `pickup-${Date.now()}-${Math.random().toString(36).slice(2)}.${photoFile.name.split('.').pop()}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('delivery-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw new Error('Failed to upload photo');

        const { data: urlData } = supabase.storage
          .from('delivery-photos')
          .getPublicUrl(uploadData.path);

        photoUrl = urlData.publicUrl;
      }

      await onSubmit(photoUrl);
      handleClose();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to confirm pickup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoError(null);
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Confirm Pickup">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {isHighValue
            ? 'This is a high-value order. Please take a photo of the package before confirming pickup.'
            : 'Confirm that you have collected the parts from the runner.'}
        </p>

        {/* Photo upload (required for high-value, optional otherwise) */}
        {(isHighValue || photoPreview) && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Package Photo {isHighValue ? '(Required)' : '(Optional)'}
            </label>

            {photoPreview ? (
              <div className="relative mb-2">
                <img
                  src={photoPreview}
                  alt="Pickup preview"
                  className="h-40 w-full rounded-button border object-cover"
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
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-button border-2 border-dashed border-slate-300 p-6 text-slate-500 hover:border-primary hover:text-primary">
                <Camera className="h-8 w-8" />
                <span className="text-sm">Take photo of package</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            )}

            {photoError && (
              <p className="mt-1.5 text-sm text-error">{photoError}</p>
            )}
          </div>
        )}

        {!isHighValue && !photoPreview && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500 hover:text-primary">
            <Camera className="h-4 w-4" />
            <span>Add photo (optional)</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </label>
        )}

        <Button
          fullWidth
          onClick={handleSubmit}
          isLoading={isSubmitting}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Confirm Pickup
        </Button>
      </div>
    </BottomSheet>
  );
}
