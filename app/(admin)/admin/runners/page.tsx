'use client';

import { useState } from 'react';
import { DataTable } from '@/components/admin/data-table';
import { FilterBar } from '@/components/admin/filter-bar';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { FloatTopupSheet } from '@/components/admin/float-topup-sheet';
import { useAdminRunners } from '@/lib/hooks/use-admin-runners';
import { useAdminRunnerDetail } from '@/lib/hooks/use-admin-runner-detail';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';

export default function AdminRunnersPage() {
  const { runners, pagination, isLoading, page, setPage, search, setSearch } = useAdminRunners();
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(null);
  const [floatTopupOpen, setFloatTopupOpen] = useState(false);
  const { runner: runnerDetail, isLoading: detailLoading, actionLoading, topUpFloat } = useAdminRunnerDetail(selectedRunnerId);

  const columns = [
    {
      header: 'Name',
      render: (row: (typeof runners)[0]) => (
        <span className="font-medium text-slate-900">{row.full_name}</span>
      ),
    },
    {
      header: 'Phone',
      render: (row: (typeof runners)[0]) => row.phone,
    },
    {
      header: 'Shift',
      render: (row: (typeof runners)[0]) => (
        <Badge variant={row.on_shift ? 'success' : 'default'}>
          {row.on_shift ? 'On Shift' : 'Off'}
        </Badge>
      ),
    },
    {
      header: 'Float',
      render: (row: (typeof runners)[0]) => formatCurrency(row.float_balance),
    },
    {
      header: 'Active Orders',
      render: (row: (typeof runners)[0]) => row.active_orders,
    },
    {
      header: 'Commission',
      render: (row: (typeof runners)[0]) => formatCurrency(row.today_commission),
    },
  ];

  const handleFloatTopup = async (amount: number) => {
    const success = await topUpFloat(amount);
    if (success) {
      toast('success', 'Float topped up successfully');
      return true;
    }
    toast('error', 'Failed to top up float');
    return false;
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Runners</h1>

      <div className="mb-4">
        <FilterBar
          fields={[{ key: 'search', label: 'Search', type: 'search' }]}
          values={{ search }}
          onApply={(vals) => { setSearch(vals.search || ''); setPage(1); }}
        />
      </div>

      <DataTable
        columns={columns}
        data={runners}
        isLoading={isLoading}
        onRowClick={(row) => setSelectedRunnerId(row.id)}
        emptyMessage="No runners found"
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: setPage,
        }}
      />

      {/* Runner Detail Sheet */}
      <BottomSheet
        isOpen={!!selectedRunnerId}
        onClose={() => setSelectedRunnerId(null)}
        title="Runner Details"
      >
        {detailLoading || !runnerDetail ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 rounded bg-slate-200" />
            <div className="h-16 rounded bg-slate-100" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Profile */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{runnerDetail.full_name}</h3>
              <p className="text-sm text-slate-500">{runnerDetail.phone}</p>
              <Badge variant={runnerDetail.is_active ? 'success' : 'error'} className="mt-1">
                {runnerDetail.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {/* Float */}
            <div className="flex items-center justify-between rounded-button bg-slate-50 p-3">
              <div>
                <p className="text-sm text-slate-500">Float Balance</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(runnerDetail.float?.balance ?? 0)}
                </p>
                {runnerDetail.float?.last_topped_up && (
                  <p className="text-xs text-slate-400">
                    Last topped up: {formatRelativeTime(runnerDetail.float.last_topped_up)}
                  </p>
                )}
              </div>
              <Button size="sm" onClick={() => setFloatTopupOpen(true)}>
                Top Up
              </Button>
            </div>

            {/* Current Shift */}
            {runnerDetail.currentShift && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Current Shift</h4>
                <div className="rounded-button bg-green-50 p-3">
                  <p className="text-sm text-slate-700">
                    Started: {new Date(runnerDetail.currentShift.started_at).toLocaleTimeString()}
                  </p>
                  <div className="mt-1 flex gap-4 text-sm">
                    <span>Orders: {runnerDetail.currentShift.orders_completed}</span>
                    <span>Sourced: {formatCurrency(runnerDetail.currentShift.total_sourced)}</span>
                    <span>Commission: {formatCurrency(runnerDetail.currentShift.commission_earned)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Shifts */}
            {runnerDetail.recentShifts.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Recent Shifts</h4>
                <div className="space-y-2">
                  {runnerDetail.recentShifts.slice(0, 5).map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between rounded-button bg-slate-50 px-3 py-2 text-sm">
                      <div>
                        <p className="text-slate-700">
                          {new Date(shift.started_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {shift.orders_completed} orders | {formatCurrency(shift.commission_earned)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {shift.discrepancy_amount !== 0 && (
                          <Badge variant="warning">{formatCurrency(shift.discrepancy_amount)} disc.</Badge>
                        )}
                        <Badge variant={shift.is_reconciled ? 'success' : 'warning'}>
                          {shift.is_reconciled ? 'Reconciled' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            {runnerDetail.recentAssignments.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Recent Orders</h4>
                <div className="space-y-1">
                  {runnerDetail.recentAssignments.slice(0, 5).map((a) => (
                    <div key={a.order_id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{formatRelativeTime(a.assigned_at)}</span>
                      <Badge variant={a.status === 'completed' ? 'success' : a.status === 'failed' ? 'error' : 'primary'}>
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Float Top Up Sheet */}
      <FloatTopupSheet
        isOpen={floatTopupOpen}
        onClose={() => setFloatTopupOpen(false)}
        runnerName={runnerDetail?.full_name ?? ''}
        currentBalance={runnerDetail?.float?.balance ?? 0}
        onConfirm={handleFloatTopup}
        isLoading={actionLoading}
      />
    </div>
  );
}
