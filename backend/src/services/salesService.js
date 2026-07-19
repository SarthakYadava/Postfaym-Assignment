import { AppError } from "../shared/errors.js";
import { toPaise } from "../shared/money.js";

export class SalesService {
  constructor(store) {
    this.store = store;
  }

  listSales() {
    return [...this.store.sales.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  createSale(input) {
    return this.store.createSale({
      userId: input.userId,
      brandId: input.brandId,
      earningCents: toPaise(input.earning),
    });
  }

  reconcileSale(saleId, status, payoutService) {
    if (!["approved", "rejected"].includes(status)) {
      throw new AppError("Sale can only be reconciled as approved or rejected");
    }

    const sale = this.store.getSale(saleId);
    if (sale.status !== "pending") {
      throw new AppError("Only pending sales can be reconciled");
    }

    sale.status = status;
    sale.reconciledAt = new Date().toISOString();

    const ledgerEntry = payoutService.settleReconciledSale(sale);
    return { sale, ledgerEntry };
  }
}
