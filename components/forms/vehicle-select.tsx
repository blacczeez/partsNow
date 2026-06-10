'use client';

import { useState, useEffect } from 'react';
import { Car, Check, ChevronDown, Plus } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { Vehicle } from '@/lib/types/database';

interface VehicleSelectProps {
  selectedId?: string;
  onSelect: (vehicle: Vehicle | null) => void;
}

export function VehicleSelect({ selectedId, onSelect }: VehicleSelectProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/users/me/vehicles');
        if (res.ok) {
          const data = await res.json();
          setVehicles(data.vehicles || []);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const selected = vehicles.find((v) => v.id === selectedId);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-3 rounded-card border border-slate-200 bg-white px-4 py-3 text-left shadow-sm"
      >
        <Car className="h-5 w-5 text-slate-400" />
        <span className={cn('flex-1 text-sm', selected ? 'text-slate-900' : 'text-slate-400')}>
          {selected
            ? `${selected.year} ${selected.make} ${selected.model}`
            : 'Select a vehicle (optional)'}
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </button>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Select Vehicle">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Car className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No vehicles saved</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/account/vehicles';
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* No vehicle option */}
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left',
                !selectedId ? 'border-primary bg-primary/5' : 'border-slate-200'
              )}
            >
              <span className="flex-1 text-sm text-slate-500">No vehicle</span>
              {!selectedId && <Check className="h-5 w-5 text-primary" />}
            </button>

            {vehicles.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onSelect(v);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left',
                  selectedId === v.id ? 'border-primary bg-primary/5' : 'border-slate-200'
                )}
              >
                <Car className="h-5 w-5 text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {v.year} {v.make} {v.model}
                  </p>
                  {(v.spec || v.nickname) && (
                    <p className="text-xs text-slate-500">
                      {[v.nickname, v.spec].filter(Boolean).join(' - ')}
                    </p>
                  )}
                </div>
                {selectedId === v.id && <Check className="h-5 w-5 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
