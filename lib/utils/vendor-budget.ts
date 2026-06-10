import { config } from '@/lib/config';

export interface VendorBudget {
  expectedVendorPrice: number;
  /** Mirrors expectedVendorPrice (legacy column name in DB). */
  maxVendorPrice: number;
}

/** Derive vendor target budget from customer selling price (includes markup). */
export function computeVendorBudget(
  sellingPrice: number,
  markupPercentage = config.business.defaultMarkupPercentage
): VendorBudget {
  const expectedVendorPrice = Math.round(sellingPrice / (1 + markupPercentage / 100));
  return { expectedVendorPrice, maxVendorPrice: expectedVendorPrice };
}

/** True when vendor price exceeds the target — triggers admin/customer price review. */
export function isVendorPriceOverBudget(
  vendorPrice: number,
  sellingPrice: number,
  markupPercentage?: number
): boolean {
  const { expectedVendorPrice } = computeVendorBudget(
    sellingPrice,
    markupPercentage ?? config.business.defaultMarkupPercentage
  );
  return vendorPrice > expectedVendorPrice;
}

export function formatVendorBudgetHint(budget: VendorBudget): string {
  return `Target vendor budget: ~₦${budget.expectedVendorPrice.toLocaleString('en-NG')}`;
}
