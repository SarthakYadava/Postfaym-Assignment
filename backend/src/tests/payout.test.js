import assert from "node:assert/strict";
import test from "node:test";
import { PayoutStore } from "../db/store.js";
import { createSeedData } from "../db/seed.js";
import { createServices } from "../services/index.js";

function freshServices() {
  return createServices(new PayoutStore(createSeedData()));
}

test("advance payout is paid only once per pending sale", () => {
  const services = freshServices();

  const firstRun = services.payoutService.runAdvancePayout({ userId: "john_doe" });
  const secondRun = services.payoutService.runAdvancePayout({ userId: "john_doe" });

  assert.equal(firstRun.salesPaid, 3);
  assert.equal(firstRun.totalAdvancedCents, 1200);
  assert.equal(secondRun.salesPaid, 3);
  assert.equal(secondRun.idempotentReplay, true);
  assert.equal(services.ledgerService.listForUser("john_doe").length, 3);
});

test("assignment reconciliation example settles to 68 rupees", () => {
  const services = freshServices();

  services.payoutService.runAdvancePayout({ userId: "john_doe" });
  services.salesService.reconcileSale("sale_1", "rejected", services.payoutService);
  services.salesService.reconcileSale("sale_2", "approved", services.payoutService);
  services.salesService.reconcileSale("sale_3", "approved", services.payoutService);

  const settlementEntries = services.ledgerService
    .listForUser("john_doe")
    .filter((entry) => ["FINAL_PAYOUT", "REJECTION_ADJUSTMENT"].includes(entry.type));
  const finalSettlement = settlementEntries.reduce((total, entry) => {
    return entry.direction === "credit" ? total + entry.amountCents : total - entry.amountCents;
  }, 0);

  assert.equal(finalSettlement, 6800);
  assert.equal(services.ledgerService.getBalance("john_doe"), 8000);
});

test("a sale cannot be reconciled twice", () => {
  const services = freshServices();

  services.salesService.reconcileSale("sale_1", "approved", services.payoutService);

  assert.throws(
    () => services.salesService.reconcileSale("sale_1", "rejected", services.payoutService),
    /Only pending sales can be reconciled/,
  );
});

test("failed withdrawal credits the amount back once", () => {
  const services = freshServices();

  services.payoutService.runAdvancePayout({ userId: "john_doe" });
  const { withdrawal } = services.withdrawalService.createWithdrawal({ userId: "john_doe", amount: 10 });

  assert.equal(services.ledgerService.getBalance("john_doe"), 200);

  const firstUpdate = services.withdrawalService.updateWithdrawalStatus(withdrawal.id, "failed");
  const secondUpdate = services.withdrawalService.updateWithdrawalStatus(withdrawal.id, "failed");

  assert.equal(firstUpdate.recoveryEntry.amountCents, 1000);
  assert.equal(secondUpdate.recoveryEntry, null);
  assert.equal(services.ledgerService.getBalance("john_doe"), 1200);
});

test("active withdrawals enforce the 24 hour restriction", () => {
  const services = freshServices();

  services.payoutService.runAdvancePayout({ userId: "john_doe" });
  services.withdrawalService.createWithdrawal({ userId: "john_doe", amount: 4 });

  assert.throws(
    () => services.withdrawalService.createWithdrawal({ userId: "john_doe", amount: 4 }),
    /Next withdrawal allowed/,
  );
});
