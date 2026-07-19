import { PayoutStore } from "./db/store.js";
import { createSeedData } from "./db/seed.js";
import { createServices } from "./services/index.js";
import { formatRupees } from "./shared/money.js";

const services = createServices(new PayoutStore(createSeedData()));

const advance = services.payoutService.runAdvancePayout({ userId: "john_doe" });
services.salesService.reconcileSale("sale_1", "rejected", services.payoutService);
services.salesService.reconcileSale("sale_2", "approved", services.payoutService);
services.salesService.reconcileSale("sale_3", "approved", services.payoutService);

const settlementEntries = services.ledgerService
  .listForUser("john_doe")
  .filter((entry) => ["FINAL_PAYOUT", "REJECTION_ADJUSTMENT"].includes(entry.type));

const finalSettlementCents = settlementEntries.reduce((total, entry) => {
  return entry.direction === "credit" ? total + entry.amountCents : total - entry.amountCents;
}, 0);

console.log("Assignment scenario");
console.log(`Advance payout: ${formatRupees(advance.totalAdvancedCents)}`);
console.log(`Final settlement after reconciliation: ${formatRupees(finalSettlementCents)}`);
console.log(`Ledger balance including prior advance: ${formatRupees(services.ledgerService.getBalance("john_doe"))}`);
