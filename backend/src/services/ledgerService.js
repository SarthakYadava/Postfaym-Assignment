export class LedgerService {
  constructor(store) {
    this.store = store;
  }

  listForUser(userId) {
    this.store.getUser(userId);
    return [...this.store.ledgerEntries.values()]
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getBalance(userId) {
    const entries = this.listForUser(userId);

    return entries.reduce((total, entry) => {
      return entry.direction === "credit" ? total + entry.amountCents : total - entry.amountCents;
    }, 0);
  }

  credit({ userId, amountCents, type, saleId = null, withdrawalId = null, description, metadata = {} }) {
    return this.store.addLedgerEntry({
      userId,
      saleId,
      withdrawalId,
      type,
      direction: "credit",
      amountCents,
      description,
      metadata,
    });
  }

  debit({ userId, amountCents, type, saleId = null, withdrawalId = null, description, metadata = {} }) {
    return this.store.addLedgerEntry({
      userId,
      saleId,
      withdrawalId,
      type,
      direction: "debit",
      amountCents,
      description,
      metadata,
    });
  }
}
