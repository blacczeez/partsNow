'use client';

import { MapPin, Truck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DeliveryStatusBarProps {
  assignmentStatus: string;
  isTracking: boolean;
  etaMinutes?: number | null;
}

export function DeliveryStatusBar({
  assignmentStatus,
  isTracking,
  etaMinutes,
}: DeliveryStatusBarProps) {
  const isAssigned = assignmentStatus === 'assigned';
  const isInTransit = assignmentStatus === 'in_progress';

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card px-4 py-3',
        isAssigned && 'bg-amber-50 text-amber-800',
        isInTransit && 'bg-indigo-50 text-indigo-800'
      )}
    >
      {isAssigned && (
        <>
          <MapPin className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Navigate to Pickup</p>
            <p className="text-xs opacity-75">
              Collect parts from the runner at the market gate
            </p>
          </div>
        </>
      )}

      {isInTransit && (
        <>
          <Truck className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">In Transit to Customer</p>
            {etaMinutes && (
              <p className="flex items-center gap-1 text-xs opacity-75">
                <Clock className="h-3 w-3" />
                ETA: {etaMinutes} min{etaMinutes !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {isTracking && (
            <span className="flex items-center gap-1 text-xs">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live
            </span>
          )}
        </>
      )}
    </div>
  );
}
