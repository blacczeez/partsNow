import type { OrderStatus } from '@/lib/types/database';

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'sourcing',
  'picked',
  'dispatched',
  'delivered',
  'cancelled',
  'rejected',
  'failed',
];

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  pending: {
    label: 'Pending',
    color: 'text-amber-800',
    bgColor: 'bg-amber-100',
    dotColor: 'bg-amber-500',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
    dotColor: 'bg-blue-500',
  },
  sourcing: {
    label: 'Sourcing',
    color: 'text-purple-800',
    bgColor: 'bg-purple-100',
    dotColor: 'bg-purple-500',
  },
  picked: {
    label: 'Picked',
    color: 'text-cyan-800',
    bgColor: 'bg-cyan-100',
    dotColor: 'bg-cyan-500',
  },
  dispatched: {
    label: 'Dispatched',
    color: 'text-indigo-800',
    bgColor: 'bg-indigo-100',
    dotColor: 'bg-indigo-500',
  },
  delivered: {
    label: 'Delivered',
    color: 'text-green-800',
    bgColor: 'bg-green-100',
    dotColor: 'bg-green-500',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    dotColor: 'bg-red-500',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    dotColor: 'bg-red-500',
  },
  failed: {
    label: 'Failed',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    dotColor: 'bg-red-500',
  },
};

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'sourcing',
  'picked',
  'dispatched',
];

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  'delivered',
  'cancelled',
  'rejected',
  'failed',
];

/** Rider is only involved after runner handoff or during active delivery. */
export const RIDER_DELIVERY_STATUSES: OrderStatus[] = ['picked', 'dispatched'];

/** Runner still sourcing — rider assignments should not exist. */
export const RIDER_PRE_DELIVERY_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'sourcing',
];

export function canAdminReassignRider(status: OrderStatus): boolean {
  return RIDER_DELIVERY_STATUSES.includes(status);
}

export function canAssignRiderToOrder(status: OrderStatus): boolean {
  return status === 'picked';
}

export function canRiderConfirmPickup(status: OrderStatus): boolean {
  return status === 'picked';
}
