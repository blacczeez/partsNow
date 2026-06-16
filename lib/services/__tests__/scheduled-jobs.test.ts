import { createMockSupabase } from '@/lib/__tests__/helpers';
import { createServiceClient } from '@/lib/supabase/service';
import { assignRunner } from '@/lib/services/dispatch';
import { getRuntimeConfig } from '@/lib/services/runtime-config';
import { writeAuditLog } from '@/lib/services/audit-log';
import { notifyOrderCancelled } from '@/lib/services/notifications';

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/services/dispatch', () => ({
  assignRunner: vi.fn(),
}));

vi.mock('@/lib/services/runtime-config', () => ({
  getRuntimeConfig: vi.fn(),
}));

vi.mock('@/lib/services/audit-log', () => ({
  writeAuditLog: vi.fn(),
  auditDetails: (summary: string, fields?: Record<string, unknown>) => ({
    summary,
    ...fields,
  }),
}));

vi.mock('@/lib/services/notifications', () => ({
  notifyOrderCancelled: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/config', () => ({
  config: {
    runner: {
      autoReassignEnabled: true,
    },
  },
}));

const mockedCreateServiceClient = vi.mocked(createServiceClient);
const mockedAssignRunner = vi.mocked(assignRunner);
const mockedGetRuntimeConfig = vi.mocked(getRuntimeConfig);
const mockedWriteAuditLog = vi.mocked(writeAuditLog);
const mockedNotifyOrderCancelled = vi.mocked(notifyOrderCancelled);

function createChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    'select',
    'update',
    'eq',
    'in',
    'not',
    'lt',
    'maybeSingle',
  ];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: unknown) => void, reject: (v: unknown) => void) =>
      Promise.resolve({ data, error }).then(resolve, reject),
  });
  return chain;
}

describe('scheduled-jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetRuntimeConfig.mockResolvedValue({
      runner: { acceptTimeoutMinutes: 5 },
    } as Awaited<ReturnType<typeof getRuntimeConfig>>);
    mockedAssignRunner.mockResolvedValue('next-assignment');
  });

  describe('processRunnerAcceptTimeouts', () => {
    it('fails stale assignments and reassigns runners', async () => {
      const staleChain = createChain([
        {
          id: 'assignment-1',
          order_id: 'order-1',
          assignee_id: 'runner-1',
          orders: { status: 'confirmed', cluster_id: 'cluster-1' },
        },
      ]);
      const updateChain = createChain({ id: 'assignment-1' });

      const { mockSupabase } = createMockSupabase();
      let assignmentUpdateCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'order_assignments') {
          assignmentUpdateCount++;
          return assignmentUpdateCount === 1 ? staleChain : updateChain;
        }
        return createChain(null);
      });
      mockedCreateServiceClient.mockReturnValue(mockSupabase);

      const { processRunnerAcceptTimeouts } = await import('../scheduled-jobs');
      const result = await processRunnerAcceptTimeouts();

      expect(result).toEqual({
        processed: 1,
        reassigned: 1,
        failedReassign: 0,
      });
      expect(mockedAssignRunner).toHaveBeenCalledWith('order-1', 'cluster-1', {
        excludeRunnerIds: ['runner-1'],
      });
      expect(mockedWriteAuditLog).toHaveBeenCalled();
    });

    it('skips assignments for non-confirmed orders', async () => {
      const staleChain = createChain([
        {
          id: 'assignment-1',
          order_id: 'order-1',
          assignee_id: 'runner-1',
          orders: { status: 'sourcing', cluster_id: 'cluster-1' },
        },
      ]);

      const { mockSupabase } = createMockSupabase();
      mockSupabase.from.mockReturnValue(staleChain);
      mockedCreateServiceClient.mockReturnValue(mockSupabase);

      const { processRunnerAcceptTimeouts } = await import('../scheduled-jobs');
      const result = await processRunnerAcceptTimeouts();

      expect(result).toEqual({
        processed: 1,
        reassigned: 0,
        failedReassign: 0,
      });
      expect(mockedAssignRunner).not.toHaveBeenCalled();
    });
  });

  describe('processExpiredPaymentHolds', () => {
    it('cancels expired pending card orders', async () => {
      const expiredChain = createChain([
        {
          id: 'order-1',
          order_number: 'ORD-001',
          customer_id: 'customer-1',
        },
      ]);
      const updateOrderChain = createChain({ id: 'order-1' });
      const updateAssignmentsChain = createChain(null);

      const { mockSupabase } = createMockSupabase();
      let ordersCall = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          ordersCall++;
          return ordersCall === 1 ? expiredChain : updateOrderChain;
        }
        if (table === 'order_assignments') {
          return updateAssignmentsChain;
        }
        return createChain(null);
      });
      mockedCreateServiceClient.mockReturnValue(mockSupabase);

      const { processExpiredPaymentHolds } = await import('../scheduled-jobs');
      const result = await processExpiredPaymentHolds();

      expect(result).toEqual({ cancelled: 1 });
      expect(mockedWriteAuditLog).toHaveBeenCalled();
      expect(mockedNotifyOrderCancelled).toHaveBeenCalledWith(
        'order-1',
        expect.stringContaining('Payment was not completed')
      );
    });
  });
});
