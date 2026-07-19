import { fromPaise } from "./money.js";

export function exposeMoney(value) {
  return {
    cents: value,
    rupees: fromPaise(value),
  };
}

export function presentSale(sale) {
  return {
    ...sale,
    earning: exposeMoney(sale.earningCents),
    advancePaid: exposeMoney(sale.advancePaidCents),
  };
}

export function presentLedgerEntry(entry) {
  return {
    ...entry,
    amount: exposeMoney(entry.amountCents),
  };
}

export function presentWithdrawal(withdrawal) {
  return {
    ...withdrawal,
    amount: exposeMoney(withdrawal.amountCents),
  };
}

export function presentSummary(summary) {
  return {
    ...summary,
    availableBalance: exposeMoney(summary.availableBalanceCents),
    pendingEarnings: exposeMoney(summary.pendingEarningsCents),
    approvedEarnings: exposeMoney(summary.approvedEarningsCents),
    rejectedEarnings: exposeMoney(summary.rejectedEarningsCents),
    advancePaid: exposeMoney(summary.advancePaidCents),
    totalCredits: exposeMoney(summary.totalCreditsCents),
    totalDebits: exposeMoney(summary.totalDebitsCents),
  };
}
