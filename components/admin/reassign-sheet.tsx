'use client';

import { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';

interface ReassignSheetProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'runner' | 'rider';
  onConfirm: (assigneeId: string) => void;
  isLoading?: boolean;
}

interface Person {
  id: string;
  full_name: string;
  phone: string;
}

export function ReassignSheet({ isOpen, onClose, role, onConfirm, isLoading }: ReassignSheetProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelected('');
    setLoading(true);
    const endpoint = role === 'runner' ? '/api/admin/runners' : '/api/admin/riders';
    fetch(`${endpoint}?limit=50`)
      .then((r) => r.json())
      .then((data) => {
        const list = role === 'runner' ? data.runners : data.riders;
        setPeople(
          (list || []).map((p: { id: string; full_name: string; phone: string }) => ({
            id: p.id,
            full_name: p.full_name,
            phone: p.phone,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [isOpen, role]);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Reassign ${role === 'runner' ? 'Runner' : 'Rider'}`}
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-button bg-slate-100" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">
          No {role}s available
        </p>
      ) : (
        <div className="space-y-2">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full rounded-button border px-4 py-3 text-left transition-colors ${
                selected === p.id
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-medium text-slate-900">{p.full_name}</p>
              <p className="text-xs text-slate-500">{p.phone}</p>
            </button>
          ))}
          <Button
            fullWidth
            disabled={!selected}
            isLoading={isLoading}
            onClick={() => onConfirm(selected)}
            className="mt-4"
          >
            Confirm Reassignment
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
