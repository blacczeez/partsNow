'use client';

import { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

export function VendorFormSheet({ isOpen, onClose, vendor, onSubmit, isLoading }: VendorFormSheetProps) {
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [locationInMarket, setLocationInMarket] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('cash');
  const [isActive, setIsActive] = useState(true);
  const [clusters, setClusters] = useState<Cluster[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Fetch clusters
      fetch('/api/admin/settings')
        .then(() => {
          // Use a simple approach - we can't easily fetch clusters from a separate endpoint
          // For now, we'll just allow free-text cluster ID input
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (vendor) {
      setName(vendor.name);
      setContactPhone(vendor.contact_phone);
      setContactName(vendor.contact_name || '');
      setClusterId(vendor.cluster_id);
      setLocationInMarket(vendor.location_in_market || '');
      setSpecializations(vendor.specializations?.join(', ') || '');
      setPaymentTerms(vendor.payment_terms || 'cash');
      setIsActive(vendor.is_active ?? true);
    } else {
      setName('');
      setContactPhone('');
      setContactName('');
      setClusterId('');
      setLocationInMarket('');
      setSpecializations('');
      setPaymentTerms('cash');
      setIsActive(true);
    }
  }, [vendor, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      name,
      contact_phone: contactPhone,
      contact_name: contactName || undefined,
      cluster_id: clusterId,
      location_in_market: locationInMarket || undefined,
      specializations: specializations ? specializations.split(',').map((s) => s.trim()).filter(Boolean) : [],
      payment_terms: paymentTerms,
    };

    if (vendor?.id) {
      data.is_active = isActive;
    }

    const success = await onSubmit(data);
    if (success) {
      onClose();
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={vendor?.id ? 'Edit Vendor' : 'Add Vendor'}
    >
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
        <Input
          label="Cluster ID"
          value={clusterId}
          onChange={(e) => setClusterId(e.target.value)}
          required
          placeholder="UUID of the cluster"
        />
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
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Payment Terms
          </label>
          <select
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className="flex h-11 w-full rounded-input border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="cash">Cash</option>
            <option value="float">Float</option>
            <option value="invoice">Invoice</option>
          </select>
        </div>
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
        <Button type="submit" fullWidth isLoading={isLoading}>
          {vendor?.id ? 'Update Vendor' : 'Add Vendor'}
        </Button>
      </form>
    </BottomSheet>
  );
}
