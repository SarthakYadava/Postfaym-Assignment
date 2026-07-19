const ADVANCE_RATE = 0.1;

export class PayoutService {
  constructor(store, ledgerService) {
    this.store = store;
    this.ledgerService = ledgerService;
  }

  runAdvancePayout({ userId = null } = {}) {
    const key = `advance:${userId ?? "all"}`;
    const existing = this.store.findIdempotency(key);
    if (existing) return { ...existing.result, idempotentReplay: true };

    const paidSales = [];
    for (const sale of this.store.sales.values()) {
      if (userId && sale.userId !== userId) continue;
      if (sale.status !== "pending" || sale.advancePaidAt) continue;

      const amountCents = Math.round(sale.earningCents * ADVANCE_RATE);
      sale.advancePaidCents = amountCents;
      sale.advancePaidAt = new Date().toISOString();

      const ledgerEntry = this.ledgerService.credit({
        userId: sale.userId,
        saleId: sale.id,
        amountCents,
        type: "ADVANCE_PAYOUT",
        description: `10% advance payout for ${sale.id}`,
        metadata: { earningCents: sale.earningCents, rate: ADVANCE_RATE },
      });

      paidSales.push({ sale, ledgerEntry });
    }

    const result = {
      salesPaid: paidSales.length,
      totalAdvancedCents: paidSales.reduce((total, item) => total + item.ledgerEntry.amountCents, 0),
      paidSales,
      idempotentReplay: false,
    };

    this.store.rememberIdempotency(key, result);
    return result;
  }

  settleReconciledSale(sale) {
    if (sale.status === "approved") {
      const finalAmountCents = sale.earningCents - sale.advancePaidCents;
      if (finalAmountCents <= 0) return null;

      return this.ledgerService.credit({
        userId: sale.userId,
        saleId: sale.id,
        amountCents: finalAmountCents,
        type: "FINAL_PAYOUT",
        description: `Final payout after approval for ${sale.id}`,
        metadata: {
          earningCents: sale.earningCents,
          advancePaidCents: sale.advancePaidCents,
        },
      });
    }

    if (sale.advancePaidCents <= 0) return null;

    return this.ledgerService.debit({
      userId: sale.userId,
      saleId: sale.id,
      amountCents: sale.advancePaidCents,
      type: "REJECTION_ADJUSTMENT",
      description: `Advance reversal after rejection for ${sale.id}`,
      metadata: {
        earningCents: sale.earningCents,
        advancePaidCents: sale.advancePaidCents,
      },
    });
  }
}
