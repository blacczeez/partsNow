'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ClusterData {
  id?: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  delivery_radius_km: number;
  is_active?: boolean;
}

interface ClusterFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cluster?: ClusterData | null;
  onSubmit: (data: Record<string, unknown>) => Promise<boolean>;
  isLoading?: boolean;
}

export function ClusterFormSheet({
  isOpen,
  onClose,
  cluster,
  onSubmit,
  isLoading,
}: ClusterFormSheetProps) {
  const [name, setName] = useState(cluster?.name ?? '');
  const [city, setCity] = useState(cluster?.city ?? '');
  const [state, setState] = useState(cluster?.state ?? 'Lagos');
  const [latitude, setLatitude] = useState(
    cluster?.latitude != null ? String(cluster.latitude) : ''
  );
  const [longitude, setLongitude] = useState(
    cluster?.longitude != null ? String(cluster.longitude) : ''
  );
  const [deliveryRadius, setDeliveryRadius] = useState(
    cluster?.delivery_radius_km != null ? String(cluster.delivery_radius_km) : '15'
  );
  const [isActive, setIsActive] = useState(cluster?.is_active ?? true);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radius = parseInt(deliveryRadius, 10);

    if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radius)) {
      setSubmitError('Latitude, longitude, and delivery radius must be valid numbers.');
      return;
    }

    const success = await onSubmit({
      name,
      city,
      state,
      latitude: lat,
      longitude: lng,
      delivery_radius_km: radius,
      ...(cluster?.id ? { is_active: isActive } : {}),
    });

    if (success) {
      onClose();
    } else {
      setSubmitError('Could not save market. Check the fields and try again.');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={cluster?.id ? 'Edit Market' : 'Add Market'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} required />
        <Input label="State" value={state} onChange={(e) => setState(e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Latitude"
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
          />
        </div>
        <Input
          label="Delivery radius (km)"
          type="number"
          value={deliveryRadius}
          onChange={(e) => setDeliveryRadius(e.target.value)}
          required
        />
        {cluster?.id && (
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
          {cluster?.id ? 'Update Market' : 'Add Market'}
        </Button>
      </form>
    </BottomSheet>
  );
}
