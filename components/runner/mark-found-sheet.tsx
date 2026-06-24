'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Store, Upload } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/format';
import { VENDOR_VERIFICATION_STATUS } from '@/lib/constants/vendors';
import type { VendorSuggestion } from '@/lib/services/runner-vendors';

interface MarkFoundSheetProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  itemId: string;
  itemDescription: string;
  targetVendorPrice?: number | null;
  customerUnitCap?: number | null;
  onSubmit: (data: {
    vendorId?: string;
    quickAddVendor?: { name: string; locationInMarket?: string };
    vendorPrice: number;
    qcImageUrl: string;
  }) => Promise<void>;
}

interface FormValues {
  vendorPrice: string;
  vendorSearch: string;
  quickAddName: string;
  quickAddLocation: string;
}

function buildQcPhotoFileName(originalName: string): string {
  const extension = originalName.split('.').pop() ?? 'jpg';
  return `qc-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
}

export function MarkFoundSheet({
  isOpen,
  onClose,
  orderId,
  itemId,
  itemDescription,
  targetVendorPrice,
  customerUnitCap,
  onSubmit,
}: MarkFoundSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<VendorSuggestion[]>([]);
  const [hasCatalogPart, setHasCatalogPart] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [vendorMode, setVendorMode] = useState<'pick' | 'quick_add'>('pick');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      vendorSearch: '',
      quickAddName: '',
      quickAddLocation: '',
      vendorPrice: '',
    },
  });

  const vendorSearch = watch('vendorSearch');
  const quickAddName = watch('quickAddName');

  useEffect(() => {
    if (!isOpen || !orderId || !itemId) return;

    let cancelled = false;
    setSuggestionsLoading(true);
    setSelectedVendorId(null);
    setVendorMode('pick');
    setVendorError(null);

    fetch(`/api/runner/orders/${orderId}/items/${itemId}/vendor-suggestions`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load vendors');
        if (!cancelled) {
          setSuggestions(data.suggestions ?? []);
          setHasCatalogPart(Boolean(data.hasCatalogPart));
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, orderId, itemId]);

  const historySuggestions = useMemo(
    () => suggestions.filter((s) => s.source === 'history'),
    [suggestions]
  );

  const filteredSuggestions = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.location_in_market?.toLowerCase().includes(q) ?? false)
    );
  }, [suggestions, vendorSearch]);

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
    setVendorError(null);

    if (vendorMode === 'pick' && !selectedVendorId) {
      setVendorError('Select a vendor or add a new stall');
      return;
    }

    if (vendorMode === 'quick_add' && !values.quickAddName.trim()) {
      setVendorError('Enter the stall or vendor name');
      return;
    }

    if (!photoFile) {
      setPhotoError('QC photo is required');
      return;
    }

    setIsSubmitting(true);
    try {
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
        vendorId: vendorMode === 'pick' ? selectedVendorId ?? undefined : undefined,
        quickAddVendor:
          vendorMode === 'quick_add'
            ? {
                name: values.quickAddName.trim(),
                locationInMarket: values.quickAddLocation.trim() || undefined,
              }
            : undefined,
        vendorPrice: parseFloat(values.vendorPrice),
        qcImageUrl: urlData.publicUrl,
      });

      reset();
      setPhotoFile(null);
      setPhotoPreview(null);
      setSelectedVendorId(null);
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
      setVendorError(null);
      setSelectedVendorId(null);
      onClose();
    }
  };

  const renderVendorRow = (vendor: VendorSuggestion) => {
    const isSelected = selectedVendorId === vendor.id && vendorMode === 'pick';
    return (
      <button
        key={vendor.id}
        type="button"
        onClick={() => {
          setVendorMode('pick');
          setSelectedVendorId(vendor.id);
          setVendorError(null);
        }}
        className={`w-full rounded-button border px-3 py-2.5 text-left transition-colors ${
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">{vendor.name}</p>
            {vendor.location_in_market && (
              <p className="text-xs text-slate-500">{vendor.location_in_market}</p>
            )}
            {vendor.last_price != null && (
              <p className="mt-0.5 text-xs text-slate-600">
                Last: {formatCurrency(vendor.last_price)}
                {vendor.price_count != null && vendor.price_count > 1
                  ? ` · ${vendor.price_count} times`
                  : ''}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {vendor.source === 'history' && (
              <Badge variant="success" className="text-[10px]">
                Sourced before
              </Badge>
            )}
            {vendor.verification_status === VENDOR_VERIFICATION_STATUS.PENDING && (
              <Badge variant="warning" className="text-[10px]">
                New
              </Badge>
            )}
          </div>
        </div>
      </button>
    );
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
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Store className="h-4 w-4 text-slate-500" />
            <label className="text-sm font-medium text-slate-700">Where did you buy it?</label>
          </div>

          <div className="mb-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={vendorMode === 'pick' ? 'primary' : 'secondary'}
              onClick={() => setVendorMode('pick')}
            >
              Pick vendor
            </Button>
            <Button
              type="button"
              size="sm"
              variant={vendorMode === 'quick_add' ? 'primary' : 'secondary'}
              onClick={() => {
                setVendorMode('quick_add');
                setSelectedVendorId(null);
              }}
            >
              New stall
            </Button>
          </div>

          {vendorMode === 'pick' ? (
            <div className="space-y-2">
              <Input
                placeholder="Search vendors..."
                {...register('vendorSearch')}
              />
              {suggestionsLoading ? (
                <p className="text-sm text-slate-500">Loading vendors...</p>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {hasCatalogPart && historySuggestions.length > 0 && !vendorSearch.trim() && (
                    <>
                      <p className="text-xs font-medium uppercase text-slate-400">
                        Suggested for this part
                      </p>
                      {historySuggestions.map(renderVendorRow)}
                    </>
                  )}
                  {filteredSuggestions.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No vendors found. Use &quot;New stall&quot; to add one.
                    </p>
                  ) : (
                    <>
                      {(!hasCatalogPart || vendorSearch.trim() || historySuggestions.length === 0) &&
                        filteredSuggestions.map(renderVendorRow)}
                      {hasCatalogPart &&
                        !vendorSearch.trim() &&
                        historySuggestions.length > 0 && (
                          <>
                            <p className="pt-1 text-xs font-medium uppercase text-slate-400">
                              All vendors in market
                            </p>
                            {filteredSuggestions
                              .filter((s) => s.source !== 'history')
                              .map(renderVendorRow)}
                          </>
                        )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                label="Stall / vendor name"
                placeholder="e.g. Emeka @ Line 12"
                {...register('quickAddName', { required: vendorMode === 'quick_add' })}
              />
              <Input
                label="Location in market (optional)"
                placeholder="Line 5, Shop 23"
                {...register('quickAddLocation')}
              />
              {quickAddName.trim() && (
                <p className="text-xs text-slate-500">
                  We&apos;ll match existing names when possible, or add this stall for admin
                  review.
                </p>
              )}
            </div>
          )}

          {vendorError && <p className="text-sm text-error">{vendorError}</p>}
        </div>

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
                return `Price cannot exceed ${formatCurrency(customerUnitCap)}`;
              }
              return true;
            },
          })}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">QC Photo</label>

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

          {photoError && <p className="mt-1.5 text-sm text-error">{photoError}</p>}
        </div>

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          <Upload className="mr-2 h-4 w-4" />
          Confirm Found
        </Button>
      </form>
    </BottomSheet>
  );
}
