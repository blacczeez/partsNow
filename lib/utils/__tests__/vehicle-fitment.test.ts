import { describe, it, expect } from 'vitest';
import {
  formatVehicleLabel,
  getPartFitmentStatus,
  partFitsVehicle,
} from '../vehicle-fitment';

const camry2018 = { make: 'Toyota', model: 'Camry', year: 2018, spec: 'Nigerian' };

describe('partFitsVehicle', () => {
  const compatible = [
    { make: 'Toyota', model: 'Camry', year_start: 2015, year_end: 2020, spec: 'Nigerian' },
    { make: 'Honda', model: 'Accord', year_start: 2016, year_end: 2021 },
  ];

  it('matches make, model, year, and spec', () => {
    expect(partFitsVehicle(compatible, camry2018)).toBe(true);
  });

  it('rejects wrong year', () => {
    expect(partFitsVehicle(compatible, { ...camry2018, year: 2012 })).toBe(false);
  });

  it('rejects spec mismatch when entry has spec', () => {
    expect(
      partFitsVehicle(compatible, { ...camry2018, spec: 'American' })
    ).toBe(false);
  });

  it('allows spec-agnostic entry', () => {
    expect(
      partFitsVehicle(compatible, { make: 'Honda', model: 'Accord', year: 2018, spec: 'European' })
    ).toBe(true);
  });
});

describe('getPartFitmentStatus', () => {
  it('returns no_data without vehicle', () => {
    expect(getPartFitmentStatus({ compatible_vehicles: [] }, null)).toBe('no_data');
  });

  it('returns fits when compatible', () => {
    expect(
      getPartFitmentStatus(
        {
          compatible_vehicles: [
            { make: 'Toyota', model: 'Camry', year_start: 2015, year_end: 2020 },
          ],
        },
        camry2018
      )
    ).toBe('fits');
  });

  it('returns no_match when catalogue lists other vehicles', () => {
    expect(
      getPartFitmentStatus(
        {
          compatible_vehicles: [
            { make: 'Honda', model: 'Accord', year_start: 2015, year_end: 2020 },
          ],
        },
        camry2018
      )
    ).toBe('no_match');
  });
});

describe('formatVehicleLabel', () => {
  it('includes nickname when set', () => {
    expect(
      formatVehicleLabel({
        year: 2018,
        make: 'Toyota',
        model: 'Camry',
        nickname: 'Workshop car',
        spec: null,
      })
    ).toBe('Workshop car (2018 Toyota Camry)');
  });
});
