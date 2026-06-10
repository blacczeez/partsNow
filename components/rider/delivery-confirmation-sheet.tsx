'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, CheckCircle } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/format';

interface DeliveryConfirmationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isCod: boolean;
  orderTotal: number;
  onSubmit: (data: { photoUrl?: string; codAmountCollected?: number }) => Promise<void>;
}

interface FormValues {
  codAmount: string;
}

function buildDeliveryPhotoFileName(originalName: string): string {
  const extension = originalName.split('.').pop() ?? 'jpg';
  return `delivery-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
}

export function DeliveryConfirmationSheet({
  isOpen,
  onClose,
  isCod,
  orderTotal,
  onSubmit,
}: DeliveryConfirmationSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: { codAmount: orderTotal.toString() },
  });

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

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let photoUrl: string | undefined;

      if (photoFile) {
        const supabase = createClient();
        const fileName = buildDeliveryPhotoFileName(photoFile.name);

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

      await onSubmit({
        photoUrl,
        codAmountCollected: isCod ? parseFloat(values.codAmount) : undefined,
      });

      handleClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to confirm delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setPhotoFile(null);
      setPhotoPreview(null);
      setSubmitError(null);
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Complete Delivery">
      <form onSubmit={handleFormSubmit(handleSubmit)} className="space-y-4">
        {isCod && (
          <div className="rounded-card border border-orange-200 bg-orange-50 p-3">
            <p className="mb-2 text-sm font-medium text-orange-800">
              Cash on Delivery: {formatCurrency(orderTotal)}
            </p>
            <Input
              label="Amount Collected (₦)"
              type="number"
              step="0.01"
              error={errors.codAmount?.message}
              {...register('codAmount', {
                required: 'Amount is required',
                validate: (v) =>
                  parseFloat(v) > 0 || 'Amount must be greater than 0',
              })}
            />
          </div>
        )}

        {/* Optional delivery photo */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Delivery Photo (Optional)
          </label>

          {photoPreview ? (
            <div className="relative mb-2">
              <img
                src={photoPreview}
                alt="Delivery preview"
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
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-button border-2 border-dashed border-slate-300 p-4 text-slate-500 hover:border-primary hover:text-primary">
              <Camera className="h-6 w-6" />
              <span className="text-sm">Take delivery photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
          )}
        </div>

        {submitError && (
          <p className="text-sm text-error">{submitError}</p>
        )}

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          <CheckCircle className="mr-2 h-4 w-4" />
          {isCod ? 'Confirm Payment & Delivery' : 'Confirm Delivery'}
        </Button>
      </form>
    </BottomSheet>
  );
}
