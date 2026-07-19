import { store } from "../db/store.js";
import { BalanceService } from "./balanceService.js";
import { LedgerService } from "./ledgerService.js";
import { PayoutService } from "./payoutService.js";
import { SalesService } from "./salesService.js";
import { WithdrawalService } from "./withdrawalService.js";

export function createServices(customStore = store) {
  const ledgerService = new LedgerService(customStore);
  const withdrawalService = new WithdrawalService(customStore, ledgerService);
  const payoutService = new PayoutService(customStore, ledgerService);
  const salesService = new SalesService(customStore);
  const balanceService = new BalanceService(customStore, ledgerService, withdrawalService);

  return {
    store: customStore,
    ledgerService,
    payoutService,
    salesService,
    withdrawalService,
    balanceService,
  };
}
