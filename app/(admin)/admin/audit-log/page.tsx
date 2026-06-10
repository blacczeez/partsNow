'use client';

import { useEffect, useState } from 'react';
import { useAdminUrlState } from '@/lib/hooks/use-admin-url-state';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { formatRelativeTime } from '@/lib/utils/format';
import Link from 'next/link';
import {
  AUDIT_ACTION_FILTER_OPTIONS,
  AUDIT_ENTITY_FILTER_OPTIONS,
  formatAuditActionDetail,
  formatAuditActionLabel,
} from '@/lib/constants/audit-log';

interface AuditEntry {
  id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string;
  entity_detail: string | null;
  entity_href: string | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

function AuditLogContent() {
  const { values, setUrlState } = useAdminUrlState(['entityType', 'action', 'search']);
  const page = parseInt(values.page || '1', 10);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (values.entityType) params.set('entityType', values.entityType);
        if (values.action) params.set('action', values.action);
        if (values.search) params.set('search', values.search);

        const res = await fetch(`/api/admin/audit-log?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load audit log');
        if (!cancelled) {
          setEntries(data.entries ?? []);
          setPagination(data.pagination ?? { page: 1, totalPages: 0 });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load audit log');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [page, values.entityType, values.action, values.search]);

  const filterFields = [
    {
      key: 'entityType',
      label: 'Record type',
      type: 'select' as const,
      options: [
        { value: '', label: 'All record types' },
        ...AUDIT_ENTITY_FILTER_OPTIONS.map(({ value, label }) => ({ value, label })),
      ],
    },
    {
      key: 'action',
      label: 'Action',
      type: 'select' as const,
      options: [
        { value: '', label: 'All actions' },
        ...AUDIT_ACTION_FILTER_OPTIONS.map(({ value, label }) => ({ value, label })),
      ],
    },
    {
      key: 'search',
      label: 'Search',
      type: 'search' as const,
    },
  ];

  const columns = [
    {
      header: 'When',
      render: (row: AuditEntry) => (
        <span className="text-slate-500">{formatRelativeTime(row.created_at)}</span>
      ),
    },
    {
      header: 'User',
      render: (row: AuditEntry) => row.user_name,
    },
    {
      header: 'Action',
      render: (row: AuditEntry) => {
        const detail = formatAuditActionDetail(row.action, row.new_values);
        return (
          <div>
            <p className="font-medium text-slate-900">
              {formatAuditActionLabel(row.action)}
            </p>
            {detail && (
              <p className="mt-0.5 text-sm text-slate-500">{detail}</p>
            )}
          </div>
        );
      },
    },
    {
      header: 'Affected record',
      render: (row: AuditEntry) => (
        <div>
          {row.entity_href ? (
            <Link
              href={row.entity_href}
              className="font-medium text-primary hover:underline"
            >
              {row.entity_label}
            </Link>
          ) : (
            <p className="font-medium text-slate-900">{row.entity_label}</p>
          )}
          {row.entity_detail && (
            <p className="mt-0.5 text-sm text-slate-500">{row.entity_detail}</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Audit Log"
        description="Track admin and system actions for accountability."
        filters={
          <FilterBar
            fields={filterFields}
            values={{
              entityType: values.entityType,
              action: values.action,
              search: values.search,
            }}
            onApply={(next) => {
              setUrlState({
                entityType: next.entityType || undefined,
                action: next.action || undefined,
                search: next.search || undefined,
                page: 1,
              });
            }}
          />
        }
      />

      {error && (
        <p className="mb-4 rounded-card border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <DataTable
        columns={columns}
        data={entries}
        isLoading={isLoading}
        emptyMessage="No audit entries found"
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: (nextPage) => setUrlState({ page: nextPage }),
        }}
      />
    </div>
  );
}

export default function AdminAuditLogPage() {
  return <AuditLogContent />;
}
