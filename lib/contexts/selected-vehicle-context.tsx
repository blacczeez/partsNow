'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Vehicle } from '@/lib/types/database';
import { useCart } from '@/lib/hooks/use-cart';

const FIT_MY_CAR_KEY = 'partsnow-fit-my-car';
const SKIP_AUTO_VEHICLE_KEY = 'partsnow-skip-auto-vehicle';

interface SelectedVehicleContextValue {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  selectedVehicleId: string | undefined;
  setSelectedVehicleId: (id: string | undefined) => void;
  fitMyCar: boolean;
  setFitMyCar: (value: boolean) => void;
  isLoading: boolean;
  refreshVehicles: () => Promise<void>;
}

const SelectedVehicleContext = createContext<SelectedVehicleContextValue | undefined>(
  undefined
);

function loadFitMyCarPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(FIT_MY_CAR_KEY) === 'true';
}

function loadSkipAutoSelect(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SKIP_AUTO_VEHICLE_KEY) === 'true';
}

function persistSkipAutoSelect(skip: boolean) {
  if (typeof window === 'undefined') return;
  if (skip) {
    localStorage.setItem(SKIP_AUTO_VEHICLE_KEY, 'true');
  } else {
    localStorage.removeItem(SKIP_AUTO_VEHICLE_KEY);
  }
}

async function fetchUserVehicles(): Promise<Vehicle[]> {
  const res = await fetch('/api/users/me/vehicles');
  if (!res.ok) return [];
  const data = await res.json();
  return data.vehicles ?? [];
}

export function SelectedVehicleProvider({ children }: { children: ReactNode }) {
  const { vehicleId, setVehicle } = useCart();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fitMyCar, setFitMyCarState] = useState(loadFitMyCarPreference);

  const vehicleIdRef = useRef(vehicleId);
  const skipAutoSelectRef = useRef(loadSkipAutoSelect());

  useEffect(() => {
    vehicleIdRef.current = vehicleId;
  }, [vehicleId]);

  const syncSelectionAfterLoad = useCallback(
    (loaded: Vehicle[]) => {
      setVehicles(loaded);

      if (loaded.length === 0) return;

      const currentId = vehicleIdRef.current;

      if (currentId && loaded.some((v) => v.id === currentId)) return;

      if (currentId && !loaded.some((v) => v.id === currentId)) {
        persistSkipAutoSelect(false);
        skipAutoSelectRef.current = false;
        const fallback = loaded.find((v) => v.is_primary) ?? loaded[0];
        setVehicle(fallback?.id);
        return;
      }

      if (skipAutoSelectRef.current) return;

      const primary = loaded.find((v) => v.is_primary) ?? loaded[0];
      if (primary) {
        setVehicle(primary.id);
      }
    },
    [setVehicle]
  );

  const refreshVehicles = useCallback(async () => {
    const loaded = await fetchUserVehicles();
    syncSelectionAfterLoad(loaded);
  }, [syncSelectionAfterLoad]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const loaded = await fetchUserVehicles();
        if (cancelled) return;
        syncSelectionAfterLoad(loaded);
      } catch {
        if (!cancelled) setVehicles([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [syncSelectionAfterLoad]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void refreshVehicles();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshVehicles]);

  const setSelectedVehicleId = useCallback(
    (id: string | undefined) => {
      const cleared = !id;
      persistSkipAutoSelect(cleared);
      skipAutoSelectRef.current = cleared;
      setVehicle(id);
    },
    [setVehicle]
  );

  const setFitMyCar = useCallback((value: boolean) => {
    setFitMyCarState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FIT_MY_CAR_KEY, value ? 'true' : 'false');
    }
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId]
  );

  return (
    <SelectedVehicleContext.Provider
      value={{
        vehicles,
        selectedVehicle,
        selectedVehicleId: vehicleId,
        setSelectedVehicleId,
        fitMyCar,
        setFitMyCar,
        isLoading,
        refreshVehicles,
      }}
    >
      {children}
    </SelectedVehicleContext.Provider>
  );
}

export function useSelectedVehicle() {
  const context = useContext(SelectedVehicleContext);
  if (!context) {
    throw new Error('useSelectedVehicle must be used within SelectedVehicleProvider');
  }
  return context;
}

/** Safe when provider may be absent (e.g. shared components). */
export function useOptionalSelectedVehicle() {
  return useContext(SelectedVehicleContext);
}
