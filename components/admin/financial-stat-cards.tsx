import { Bike, DollarSign, Percent } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { formatCurrency } from '@/lib/utils/format';
import type { AdminFinancialTotals } from '@/lib/services/admin-financials';
import { ADMIN_FINANCIAL_DESCRIPTIONS } from '@/lib/services/admin-financials';

interface FinancialStatCardsProps {
  financials: AdminFinancialTotals;
  descriptions?: typeof ADMIN_FINANCIAL_DESCRIPTIONS;
  className?: string;
}

export function FinancialStatCards({
  financials,
  descriptions = ADMIN_FINANCIAL_DESCRIPTIONS,
  className,
}: FinancialStatCardsProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={Percent}
          label="Service fee"
          value={formatCurrency(financials.serviceFeeTotal)}
          subtitle={`${financials.paidOrderCount} paid order${financials.paidOrderCount === 1 ? '' : 's'}`}
          description={descriptions.serviceFee}
        />
        <StatCard
          icon={DollarSign}
          label="Delivery revenue"
          value={formatCurrency(financials.deliveryRevenueTotal)}
          subtitle={`${financials.paidOrderCount} paid order${financials.paidOrderCount === 1 ? '' : 's'}`}
          description={descriptions.deliveryRevenue}
        />
        <StatCard
          icon={Bike}
          label="Runner commission"
          value={formatCurrency(financials.commissionTotal)}
          subtitle={`${financials.shiftCount} shift${financials.shiftCount === 1 ? '' : 's'}`}
          description={descriptions.commission}
        />
      </div>
    </div>
  );
}
