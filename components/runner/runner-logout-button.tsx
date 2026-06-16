'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ShiftSummaryModal } from '@/components/runner/shift-summary-modal';
import { useLogout } from '@/lib/hooks/use-logout';
import { useRunnerShift } from '@/lib/hooks/use-runner-shift';
import { useRunnerOrders } from '@/lib/hooks/use-runner-orders';
import { countRunnerShiftBlockingOrders } from '@/lib/utils/runner-price-review';
import { toast } from '@/components/ui/toast';

export function RunnerLogoutButton() {
  const { logout, isLoggingOut } = useLogout();
  const { shift, float, endShift, isLoading: shiftLoading } = useRunnerShift();
  const { orders, isLoading: ordersLoading } = useRunnerOrders(Boolean(shift));
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showEndShift, setShowEndShift] = useState(false);
  const [isEndingShift, setIsEndingShift] = useState(false);

  const blockingOrderCount = countRunnerShiftBlockingOrders(orders);

  const handleLogoutClick = () => {
    if (shiftLoading || ordersLoading) return;

    if (!shift) {
      void logout();
      return;
    }

    if (blockingOrderCount > 0) {
      setShowBlockedModal(true);
      return;
    }

    setShowEndShift(true);
  };

  const handleEndShiftAndLogout = async (notes?: string) => {
    setIsEndingShift(true);
    try {
      await endShift(notes);
      toast('success', 'Shift ended');
      setShowEndShift(false);
      await logout();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to end shift');
      throw err;
    } finally {
      setIsEndingShift(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        fullWidth
        isLoading={isLoggingOut || isEndingShift}
        disabled={shiftLoading || ordersLoading}
        onClick={handleLogoutClick}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </Button>

      <Modal
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        title="Finish your orders first"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            You&apos;re still on shift with{' '}
            <strong>
              {blockingOrderCount} order{blockingOrderCount !== 1 ? 's' : ''}
            </strong>{' '}
            that need sourcing or handoff. Orders waiting on admin or customer
            will transfer automatically when you end your shift.
          </p>
          <Link href="/runner/dashboard" onClick={() => setShowBlockedModal(false)}>
            <Button fullWidth>Go to dashboard</Button>
          </Link>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowBlockedModal(false)}
          >
            Stay logged in
          </Button>
        </div>
      </Modal>

      {shift && (
        <ShiftSummaryModal
          isOpen={showEndShift}
          onClose={() => setShowEndShift(false)}
          shift={shift}
          float={float}
          onConfirmEnd={handleEndShiftAndLogout}
          footerHint="You'll be logged out after your shift ends."
          confirmLabel="End shift & log out"
        />
      )}
    </>
  );
}
