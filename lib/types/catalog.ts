import type { Part } from '@/lib/types/database';
import type { PartFitmentStatus } from '@/lib/utils/vehicle-fitment';

export type CatalogPart = Part & {
  fitment?: PartFitmentStatus;
};
