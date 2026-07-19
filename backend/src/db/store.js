import crypto from "node:crypto";
import { createSeedData } from "./seed.js";
import { AppError, notFound } from "../shared/errors.js";

export class PayoutStore {
  constructor(seedData = createSeedData()) {
    this.load(seedData);
  }

  load(data) {
    this.users = new Map(data.users.map((item) => [item.id, structuredClone(item)]));
    this.brands = new Map(data.brands.map((item) => [item.id, structuredClone(item)]));
    this.sales = new Map(data.sales.map((item) => [item.id, structuredClone(item)]));
    this.ledgerEntries = new Map(data.ledgerEntries.map((item) => [item.id, structuredClone(item)]));
    this.withdrawals = new Map(data.withdrawals.map((item) => [item.id, structuredClone(item)]));
    this.idempotencyKeys = new Map(data.idempotencyKeys.map((item) => [item.key, structuredClone(item)]));
  }

  reset() {
    this.load(createSeedData());
  }

  nextId(prefix) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }

  listUsers() {
    return [...this.users.values()];
  }

  listBrands() {
    return [...this.brands.values()];
  }

  getUser(userId) {
    const user = this.users.get(userId);
    if (!user) throw notFound(`User ${userId} was not found`);
    return user;
  }

  getSale(saleId) {
    const sale = this.sales.get(saleId);
    if (!sale) throw notFound(`Sale ${saleId} was not found`);
    return sale;
  }

  getWithdrawal(withdrawalId) {
    const withdrawal = this.withdrawals.get(withdrawalId);
    if (!withdrawal) throw notFound(`Withdrawal ${withdrawalId} was not found`);
    return withdrawal;
  }

  createSale({ userId, brandId, earningCents }) {
    this.getUser(userId);
    if (!this.brands.has(brandId)) throw notFound(`Brand ${brandId} was not found`);
    if (earningCents <= 0) throw new AppError("Sale earning must be positive");

    const sale = {
      id: this.nextId("sale"),
      userId,
      brandId,
      status: "pending",
      earningCents,
      advancePaidCents: 0,
      advancePaidAt: null,
      reconciledAt: null,
      createdAt: new Date().toISOString(),
    };

    this.sales.set(sale.id, sale);
    return sale;
  }

  addLedgerEntry(entry) {
    const record = {
      id: this.nextId("ledger"),
      createdAt: new Date().toISOString(),
      ...entry,
    };

    if (!["credit", "debit"].includes(record.direction)) {
      throw new AppError("Ledger direction must be credit or debit");
    }

    if (record.amountCents <= 0) {
      throw new AppError("Ledger amount must be positive");
    }

    this.ledgerEntries.set(record.id, record);
    return record;
  }

  rememberIdempotency(key, result) {
    this.idempotencyKeys.set(key, {
      key,
      result,
      createdAt: new Date().toISOString(),
    });
  }

  findIdempotency(key) {
    return this.idempotencyKeys.get(key);
  }
}

export const store = new PayoutStore();
