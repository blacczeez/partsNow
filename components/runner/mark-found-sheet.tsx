'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Upload } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

import { formatCurrency } from '@/lib/utils/format';

interface MarkFoundSheetProps {
  isOpen: boolean;
  onClose: () => void;
  itemDescription: string;
  targetVendorPrice?: number | null;
  customerUnitCap?: number | null;
  onSubmit: (data: { vendorPrice: number; qcImageUrl: string }) => Promise<void>;
}

interface FormValues {
  vendorPrice: string;
}

function buildQcPhotoFileName(originalName: string): string {
  const extension = originalName.split('.').pop() ?? 'jpg';
  return `qc-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
}

export function MarkFoundSheet({
  isOpen,
  onClose,
  itemDescription,
  targetVendorPrice,
  customerUnitCap,
  onSubmit,
}: MarkFoundSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>();

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

  const handleFormSubmit = async (values: FormValues) => {
    if (!photoFile) {
      setPhotoError('QC photo is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photo to Supabase Storage
      const supabase = createClient();
      const fileName = buildQcPhotoFileName(photoFile.name);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('qc-photos')
        .upload(fileName, photoFile);

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload photo');
      }

      const { data: urlData } = supabase.storage
        .from('qc-photos')
        .getPublicUrl(uploadData.path);

      await onSubmit({
        vendorPrice: parseFloat(values.vendorPrice),
        qcImageUrl: urlData.publicUrl,
      });

      // Reset form
      reset();
      setPhotoFile(null);
      setPhotoPreview(null);
      onClose();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoError(null);
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Mark as Found">
      <p className="mb-4 text-sm text-slate-600">{itemDescription}</p>

      {targetVendorPrice != null && (
        <div className="mb-4 rounded-button bg-primary/5 px-3 py-2 text-sm text-slate-700">
          <p>
            Target:{' '}
            <span className="font-semibold text-success">
              {formatCurrency(targetVendorPrice)}
            </span>{' '}
            per unit — negotiate at or below if you can.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Paying above target triggers admin review and customer approval for the
            difference.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          label="Vendor Price (₦)"
          type="number"
          step="0.01"
          placeholder="Enter the price you paid"
          error={errors.vendorPrice?.message}
          {...register('vendorPrice', {
            required: 'Price is required',
            validate: (v) => {
              const price = parseFloat(v);
              if (Number.isNaN(price) || price <= 0) {
                return 'Price must be greater than 0';
              }
              if (customerUnitCap != null && price > customerUnitCap) {
                return `Price cannot exceed ${formatCurrency(customerUnitCap)} (customer part price)`;
              }
              return true;
            },
          })}
        />

        {/* QC Photo */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            QC Photo
          </label>

          {photoPreview ? (
            <div className="relative mb-2">
              <img
                src={photoPreview}
                alt="QC preview"
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
              <span className="text-sm">Take or upload photo</span>
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

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          <Upload className="mr-2 h-4 w-4" />
          Confirm Found
        </Button>
      </form>
    </BottomSheet>
  );
}
