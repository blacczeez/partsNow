'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Car, Plus, Trash2, Star, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Modal } from '@/components/ui/modal';
import { VehicleForm } from '@/components/forms/vehicle-form';
import { toast } from '@/components/ui/toast';
import type { Vehicle } from '@/lib/types/database';
import type { CreateVehicleInput } from '@/lib/validators/user';
import { useSelectedVehicle } from '@/lib/contexts/selected-vehicle-context';

export default function VehiclesPage() {
  const { refreshVehicles: refreshSelectedVehicle } = useSelectedVehicle();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  async function handleAdd(data: CreateVehicleInput) {
    const res = await fetch('/api/users/me/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add vehicle');
    toast('success', 'Vehicle added');
    setShowAdd(false);
    await Promise.all([fetchVehicles(), refreshSelectedVehicle()]);
  }

  async function handleEdit(data: CreateVehicleInput) {
    if (!editVehicle) return;
    const res = await fetch(`/api/users/me/vehicles/${editVehicle.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update vehicle');
    toast('success', 'Vehicle updated');
    setEditVehicle(null);
    await Promise.all([fetchVehicles(), refreshSelectedVehicle()]);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/me/vehicles/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast('success', 'Vehicle removed');
      setDeleteTarget(null);
      await Promise.all([fetchVehicles(), refreshSelectedVehicle()]);
    } catch {
      toast('error', 'Failed to delete vehicle');
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:top-[6.5rem]">
        <Link href="/account" className="rounded-button p-1 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-slate-900">My Vehicles</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Vehicle List */}
      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16">
          <Car className="h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No vehicles saved</p>
          <p className="text-xs text-slate-400">Add a vehicle to speed up ordering</p>
          <Button variant="secondary" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="flex items-start gap-3 rounded-card border border-slate-200 bg-white p-4 shadow-sm"
            >
              <Car className="mt-0.5 h-5 w-5 text-slate-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">
                    {v.year} {v.make} {v.model}
                  </p>
                  {v.is_primary && (
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[v.nickname, v.spec].filter(Boolean).join(' - ') || 'No details'}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setEditVehicle(v)}
                    className="text-xs font-medium text-primary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(v)}
                    className="text-xs font-medium text-error"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Sheet */}
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Vehicle">
        <VehicleForm
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      </BottomSheet>

      {/* Edit Vehicle Sheet */}
      <BottomSheet
        isOpen={!!editVehicle}
        onClose={() => setEditVehicle(null)}
        title="Edit Vehicle"
      >
        {editVehicle && (
          <VehicleForm
            vehicle={editVehicle}
            onSubmit={handleEdit}
            onCancel={() => setEditVehicle(null)}
          />
        )}
      </BottomSheet>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Vehicle"
      >
        <p className="mb-4 text-sm text-slate-600">
          Remove {deleteTarget?.year} {deleteTarget?.make} {deleteTarget?.model}? This
          action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            fullWidth
            isLoading={isDeleting}
            onClick={handleDelete}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
