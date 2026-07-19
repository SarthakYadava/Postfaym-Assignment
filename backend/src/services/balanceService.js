export class BalanceService {
  constructor(store, ledgerService, withdrawalService) {
    this.store = store;
    this.ledgerService = ledgerService;
    this.withdrawalService = withdrawalService;
  }

  getUserSummary(userId) {
    this.store.getUser(userId);
    const sales = [...this.store.sales.values()].filter((sale) => sale.userId === userId);
    const ledger = this.ledgerService.listForUser(userId);

    return {
      userId,
      availableBalanceCents: this.ledgerService.getBalance(userId),
      pendingEarningsCents: sum(sales.filter((sale) => sale.status === "pending"), "earningCents"),
      approvedEarningsCents: sum(sales.filter((sale) => sale.status === "approved"), "earningCents"),
      rejectedEarningsCents: sum(sales.filter((sale) => sale.status === "rejected"), "earningCents"),
      advancePaidCents: sum(sales, "advancePaidCents"),
      totalCreditsCents: sum(ledger.filter((entry) => entry.direction === "credit"), "amountCents"),
      totalDebitsCents: sum(ledger.filter((entry) => entry.direction === "debit"), "amountCents"),
      withdrawalCooldown: this.withdrawalService.getWithdrawalCooldown(userId),
    };
  }
}

function sum(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}
