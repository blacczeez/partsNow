'use client';

import { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface VendorData {
  id?: string;
  name: string;
  contact_phone: string;
  contact_name: string;
  cluster_id: string;
  location_in_market: string;
  specializations: string[];
  payment_terms: string;
  is_active?: boolean;
}

interface VendorFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  vendor?: VendorData | null;
  onSubmit: (data: Record<string, unknown>) => Promise<boolean>;
  isLoading?: boolean;
}

interface Cluster {
  id: string;
  name: string;
}

interface VendorFormFieldsProps {
  vendor?: VendorData | null;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<boolean>;
  isLoading?: boolean;
}

function VendorFormFields({ vendor, onClose, onSubmit, isLoading }: VendorFormFieldsProps) {
  const [name, setName] = useState(vendor?.name ?? '');
  const [contactPhone, setContactPhone] = useState(vendor?.contact_phone ?? '');
  const [contactName, setContactName] = useState(vendor?.contact_name ?? '');
  const [clusterId, setClusterId] = useState(vendor?.cluster_id ?? '');
  const [locationInMarket, setLocationInMarket] = useState(vendor?.location_in_market ?? '');
  const [specializations, setSpecializations] = useState(
    vendor?.specializations?.join(', ') ?? ''
  );
  const [paymentTerms, setPaymentTerms] = useState(vendor?.payment_terms ?? 'cash');
  const [isActive, setIsActive] = useState(vendor?.is_active ?? true);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetch('/api/admin/clusters')
      .then((res) => res.json())
      .then((data) => setClusters(data.clusters ?? []))
      .catch(() => setClusters([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!clusterId) {
      setSubmitError('Please select a market.');
      return;
    }

    const data: Record<string, unknown> = {
      name,
      contact_phone: contactPhone,
      contact_name: contactName || undefined,
      cluster_id: clusterId,
      location_in_market: locationInMarket || undefined,
      specializations: specializations
        ? specializations.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      payment_terms: paymentTerms,
    };

    if (vendor?.id) {
      data.is_active = isActive;
    }

    const success = await onSubmit(data);
    if (success) {
      onClose();
    } else {
      setSubmitError('Could not save vendor. Check the fields and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Vendor Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        label="Contact Phone"
        value={contactPhone}
        onChange={(e) => setContactPhone(e.target.value)}
        required
      />
      <Input
        label="Contact Name"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
      />
      <Select
        label="Market"
        value={clusterId}
        onChange={(e) => setClusterId(e.target.value)}
        required
      >
        <option value="">Select market</option>
        {clusters.map((cluster) => (
          <option key={cluster.id} value={cluster.id}>
            {cluster.name}
          </option>
        ))}
      </Select>
      <Input
        label="Location in Market"
        value={locationInMarket}
        onChange={(e) => setLocationInMarket(e.target.value)}
        placeholder="e.g. Line 5, Shop 23"
      />
      <Input
        label="Specializations"
        value={specializations}
        onChange={(e) => setSpecializations(e.target.value)}
        placeholder="Toyota, Honda, German (comma-separated)"
      />
      <Select
        label="Payment Terms"
        value={paymentTerms}
        onChange={(e) => setPaymentTerms(e.target.value)}
      >
        <option value="cash">Cash</option>
        <option value="float">Float</option>
        <option value="invoice">Invoice</option>
      </Select>
      {vendor?.id && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-slate-700">Active</span>
        </label>
      )}
      {submitError && <p className="text-sm text-error">{submitError}</p>}
      <Button type="submit" fullWidth isLoading={isLoading}>
        {vendor?.id ? 'Update Vendor' : 'Add Vendor'}
      </Button>
    </form>
  );
}

export function VendorFormSheet({ isOpen, onClose, vendor, onSubmit, isLoading }: VendorFormSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={vendor?.id ? 'Edit Vendor' : 'Add Vendor'}
    >
      {isOpen && (
        <VendorFormFields
          key={vendor?.id ?? 'new'}
          vendor={vendor}
          onClose={onClose}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      )}
    </BottomSheet>
  );
}
