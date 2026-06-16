'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { createVehicleSchema, type CreateVehicleInput } from '@/lib/validators/user';
import { VEHICLE_MAKES, getModelsForMake, getAllModels } from '@/lib/data/vehicle-makes-models';
import type { Vehicle } from '@/lib/types/database';

const specs = ['American', 'European', 'Nigerian', 'Japanese', 'Other'] as const;

interface VehicleFormProps {
  vehicle?: Vehicle;
  onSubmit: (data: CreateVehicleInput) => Promise<void>;
  onCancel?: () => void;
}

export function VehicleForm({ vehicle, onSubmit, onCancel }: VehicleFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: vehicle
      ? {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          spec: (vehicle.spec as CreateVehicleInput['spec']) || undefined,
          nickname: vehicle.nickname || '',
          is_primary: vehicle.is_primary,
        }
      : { is_primary: false },
  });

  const selectedMake = watch('make');
  const modelOptions = selectedMake
    ? getModelsForMake(selectedMake)
    : getAllModels();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="make"
        control={control}
        render={({ field }) => (
          <Combobox
            label="Make"
            id="make"
            placeholder="e.g. Toyota"
            options={VEHICLE_MAKES}
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.make?.message}
          />
        )}
      />
      <Controller
        name="model"
        control={control}
        render={({ field }) => (
          <Combobox
            label="Model"
            id="model"
            placeholder="e.g. Camry"
            options={modelOptions}
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.model?.message}
          />
        )}
      />
      <Input
        label="Year"
        id="year"
        type="number"
        placeholder="e.g. 2020"
        error={errors.year?.message}
        {...register('year', { valueAsNumber: true })}
      />

      <Select
        label="Spec (optional)"
        id="spec"
        {...register('spec')}
      >
        <option value="">Select spec</option>
        {specs.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>

      <Input
        label="Nickname (optional)"
        id="nickname"
        placeholder='e.g. "My Camry"'
        error={errors.nickname?.message}
        {...register('nickname')}
      />

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          {...register('is_primary')}
        />
        Set as primary vehicle
      </label>

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          {vehicle ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  );
}
