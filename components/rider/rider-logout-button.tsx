'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useLogout } from '@/lib/hooks/use-logout';
import { useRiderOrders } from '@/lib/hooks/use-rider-orders';
import { countRiderLogoutBlockingDeliveries } from '@/lib/utils/rider-delivery';
import { toast } from '@/components/ui/toast';

export function RiderLogoutButton() {
  const { logout, isLoggingOut } = useLogout();
  const { orders, isLoading: deliveriesLoading } = useRiderOrders();
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const blockingCount = countRiderLogoutBlockingDeliveries(orders);

  const handleLogoutClick = async () => {
    if (deliveriesLoading) return;

    if (blockingCount > 0) {
      setShowBlockedModal(true);
      return;
    }

    setIsReleasing(true);
    try {
      if (orders.some((d) => d.assignment_status === 'assigned')) {
        const res = await fetch('/api/rider/orders/release-pending', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to release pending deliveries');
        }
      }
      await logout();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to log out');
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        fullWidth
        isLoading={isLoggingOut || isReleasing}
        disabled={deliveriesLoading}
        onClick={() => void handleLogoutClick()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </Button>

      <Modal
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        title="Finish your deliveries first"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            You have{' '}
            <strong>
              {blockingCount} active delivery{blockingCount !== 1 ? 'ies' : ''}
            </strong>{' '}
            in progress or ready for pickup. Complete them, report an issue, or decline
            before logging out. Pickups waiting on admin or customer can be handed off
            from the delivery screen.
          </p>
          <Link href="/rider/dashboard" onClick={() => setShowBlockedModal(false)}>
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
    </>
  );
}
