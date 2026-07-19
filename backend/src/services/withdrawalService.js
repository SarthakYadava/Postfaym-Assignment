import { AppError } from "../shared/errors.js";
import { toPaise } from "../shared/money.js";

const RECOVERABLE_STATUSES = new Set(["failed", "cancelled", "rejected"]);
const ACTIVE_COOLDOWN_STATUSES = new Set(["initiated", "processing", "success"]);
const DAY_MS = 24 * 60 * 60 * 1000;

export class WithdrawalService {
  constructor(store, ledgerService) {
    this.store = store;
    this.ledgerService = ledgerService;
  }

  listWithdrawals(userId = null) {
    return [...this.store.withdrawals.values()]
      .filter((withdrawal) => !userId || withdrawal.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  createWithdrawal({ userId, amount }) {
    const amountCents = toPaise(amount);
    this.store.getUser(userId);

    if (amountCents <= 0) {
      throw new AppError("Withdrawal amount must be positive");
    }

    const balanceCents = this.ledgerService.getBalance(userId);
    if (amountCents > balanceCents) {
      throw new AppError("Insufficient withdrawable balance");
    }

    const cooldown = this.getWithdrawalCooldown(userId);
    if (cooldown.locked) {
      throw new AppError(`Next withdrawal allowed at ${cooldown.nextAllowedAt}`, 429, "WITHDRAWAL_COOLDOWN");
    }

    const withdrawal = {
      id: this.store.nextId("wd"),
      userId,
      amountCents,
      status: "initiated",
      creditedBackAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.store.withdrawals.set(withdrawal.id, withdrawal);
    const ledgerEntry = this.ledgerService.debit({
      userId,
      withdrawalId: withdrawal.id,
      amountCents,
      type: "WITHDRAWAL_DEBIT",
      description: `Withdrawal initiated for ${withdrawal.id}`,
    });

    return { withdrawal, ledgerEntry };
  }

  updateWithdrawalStatus(withdrawalId, status) {
    if (!["initiated", "processing", "success", "failed", "cancelled", "rejected"].includes(status)) {
      throw new AppError("Unsupported withdrawal status");
    }

    const withdrawal = this.store.getWithdrawal(withdrawalId);
    const previousStatus = withdrawal.status;
    withdrawal.status = status;
    withdrawal.updatedAt = new Date().toISOString();

    let recoveryEntry = null;
    if (RECOVERABLE_STATUSES.has(status) && !withdrawal.creditedBackAt) {
      withdrawal.creditedBackAt = new Date().toISOString();
      recoveryEntry = this.ledgerService.credit({
        userId: withdrawal.userId,
        withdrawalId: withdrawal.id,
        amountCents: withdrawal.amountCents,
        type: "FAILED_WITHDRAWAL_CREDIT",
        description: `Recovered ${status} withdrawal ${withdrawal.id}`,
        metadata: { previousStatus },
      });
    }

    return { withdrawal, recoveryEntry };
  }

  getWithdrawalCooldown(userId) {
    const latest = this.listWithdrawals(userId)
      .filter((withdrawal) => ACTIVE_COOLDOWN_STATUSES.has(withdrawal.status))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    if (!latest) return { locked: false, nextAllowedAt: null };

    const nextAllowedTime = new Date(latest.createdAt).getTime() + DAY_MS;
    const locked = Date.now() < nextAllowedTime;

    return {
      locked,
      lastWithdrawalAt: latest.createdAt,
      nextAllowedAt: locked ? new Date(nextAllowedTime).toISOString() : null,
    };
  }
}
