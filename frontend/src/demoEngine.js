const USER_ID = "john_doe";
const ADVANCE_RATE = 0.1;

let state = seedState();
let idCounter = 1;

function toPaise(value) {
  return Math.round(Number(value) * 100);
}

function money(cents) {
  return { cents, rupees: Number((cents / 100).toFixed(2)) };
}

function now() {
  return new Date().toISOString();
}

function nextId(prefix) {
  return `${prefix}_${idCounter++}`;
}

function seedState() {
  const createdAt = new Date("2026-07-19T08:30:00.000Z").toISOString();

  return {
    users: [{ id: USER_ID, name: "John Doe", handle: "@john_doe", createdAt }],
    brands: [
      { id: "brand_1", name: "Brand One" },
      { id: "brand_2", name: "Brand Two" },
      { id: "brand_3", name: "Brand Three" },
    ],
    sales: ["sale_1", "sale_2", "sale_3"].map((id) => ({
      id,
      userId: USER_ID,
      brandId: "brand_1",
      status: "pending",
      earningCents: 4000,
      advancePaidCents: 0,
      advancePaidAt: null,
      reconciledAt: null,
      createdAt,
    })),
    ledger: [],
    withdrawals: [],
    advanceJobRan: false,
  };
}

function presentSale(sale) {
  return {
    ...sale,
    earning: money(sale.earningCents),
    advancePaid: money(sale.advancePaidCents),
  };
}

function presentLedger(entry) {
  return { ...entry, amount: money(entry.amountCents) };
}

function presentWithdrawal(withdrawal) {
  return { ...withdrawal, amount: money(withdrawal.amountCents) };
}

function addLedger(entry) {
  const record = {
    id: nextId("ledger"),
    createdAt: now(),
    metadata: {},
    ...entry,
  };
  state.ledger.push(record);
  return record;
}

function balanceFor(userId) {
  return state.ledger
    .filter((entry) => entry.userId === userId)
    .reduce((total, entry) => entry.direction === "credit" ? total + entry.amountCents : total - entry.amountCents, 0);
}

function summaryFor(userId) {
  const sales = state.sales.filter((sale) => sale.userId === userId);
  const ledger = state.ledger.filter((entry) => entry.userId === userId);
  const activeWithdrawal = state.withdrawals.find((item) => ["initiated", "processing", "success"].includes(item.status));
  const nextAllowed = activeWithdrawal ? new Date(new Date(activeWithdrawal.createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString() : null;

  return {
    userId,
    availableBalanceCents: balanceFor(userId),
    availableBalance: money(balanceFor(userId)),
    pendingEarningsCents: sum(sales.filter((sale) => sale.status === "pending"), "earningCents"),
    pendingEarnings: money(sum(sales.filter((sale) => sale.status === "pending"), "earningCents")),
    approvedEarningsCents: sum(sales.filter((sale) => sale.status === "approved"), "earningCents"),
    approvedEarnings: money(sum(sales.filter((sale) => sale.status === "approved"), "earningCents")),
    rejectedEarningsCents: sum(sales.filter((sale) => sale.status === "rejected"), "earningCents"),
    rejectedEarnings: money(sum(sales.filter((sale) => sale.status === "rejected"), "earningCents")),
    advancePaidCents: sum(sales, "advancePaidCents"),
    advancePaid: money(sum(sales, "advancePaidCents")),
    totalCreditsCents: sum(ledger.filter((entry) => entry.direction === "credit"), "amountCents"),
    totalCredits: money(sum(ledger.filter((entry) => entry.direction === "credit"), "amountCents")),
    totalDebitsCents: sum(ledger.filter((entry) => entry.direction === "debit"), "amountCents"),
    totalDebits: money(sum(ledger.filter((entry) => entry.direction === "debit"), "amountCents")),
    withdrawalCooldown: {
      locked: Boolean(activeWithdrawal),
      lastWithdrawalAt: activeWithdrawal?.createdAt ?? null,
      nextAllowedAt: nextAllowed,
    },
  };
}

function sum(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

function parseBody(options) {
  return options.body ? JSON.parse(options.body) : {};
}

export async function demoApi(path, options = {}) {
  const method = options.method ?? "GET";
  const body = parseBody(options);

  if (path === "/demo/reset" && method === "POST") {
    state = seedState();
    idCounter = 1;
    return { ok: true, message: "Demo data reset" };
  }

  if (path === `/users/${USER_ID}/balance`) {
    return { summary: summaryFor(USER_ID) };
  }

  if (path === "/sales") {
    return { sales: state.sales.map(presentSale) };
  }

  if (path === `/users/${USER_ID}/ledger`) {
    return { entries: [...state.ledger].reverse().map(presentLedger) };
  }

  if (path.startsWith(`/withdrawals?userId=${USER_ID}`)) {
    return { withdrawals: [...state.withdrawals].reverse().map(presentWithdrawal) };
  }

  if (path === "/payouts/advance/run" && method === "POST") {
    if (state.advanceJobRan) {
      return { salesPaid: 3, totalAdvancedCents: 1200, paidSales: [], idempotentReplay: true };
    }

    const paidSales = [];
    for (const sale of state.sales) {
      if (sale.status !== "pending" || sale.advancePaidAt) continue;
      sale.advancePaidCents = Math.round(sale.earningCents * ADVANCE_RATE);
      sale.advancePaidAt = now();
      const ledgerEntry = addLedger({
        userId: sale.userId,
        saleId: sale.id,
        withdrawalId: null,
        type: "ADVANCE_PAYOUT",
        direction: "credit",
        amountCents: sale.advancePaidCents,
        description: `10% advance payout for ${sale.id}`,
      });
      paidSales.push({ sale: presentSale(sale), ledgerEntry: presentLedger(ledgerEntry) });
    }

    state.advanceJobRan = true;
    return {
      salesPaid: paidSales.length,
      totalAdvancedCents: sum(paidSales.map((item) => item.ledgerEntry), "amountCents"),
      paidSales,
      idempotentReplay: false,
    };
  }

  const reconcileMatch = path.match(/^\/sales\/(.+)\/reconcile$/);
  if (reconcileMatch && method === "POST") {
    const sale = state.sales.find((item) => item.id === reconcileMatch[1]);
    if (!sale) throw new Error("Sale was not found");
    if (sale.status !== "pending") throw new Error("Only pending sales can be reconciled");
    if (!["approved", "rejected"].includes(body.status)) throw new Error("Unsupported sale status");

    sale.status = body.status;
    sale.reconciledAt = now();
    let ledgerEntry = null;

    if (sale.status === "approved") {
      const amountCents = sale.earningCents - sale.advancePaidCents;
      if (amountCents > 0) {
        ledgerEntry = addLedger({
          userId: sale.userId,
          saleId: sale.id,
          withdrawalId: null,
          type: "FINAL_PAYOUT",
          direction: "credit",
          amountCents,
          description: `Final payout after approval for ${sale.id}`,
        });
      }
    } else if (sale.advancePaidCents > 0) {
      ledgerEntry = addLedger({
        userId: sale.userId,
        saleId: sale.id,
        withdrawalId: null,
        type: "REJECTION_ADJUSTMENT",
        direction: "debit",
        amountCents: sale.advancePaidCents,
        description: `Advance reversal after rejection for ${sale.id}`,
      });
    }

    return { sale: presentSale(sale), ledgerEntry: ledgerEntry ? presentLedger(ledgerEntry) : null };
  }

  if (path === "/withdrawals" && method === "POST") {
    const amountCents = toPaise(body.amount);
    if (amountCents <= 0) throw new Error("Withdrawal amount must be positive");
    if (amountCents > balanceFor(body.userId)) throw new Error("Insufficient withdrawable balance");
    const active = state.withdrawals.find((item) => ["initiated", "processing", "success"].includes(item.status));
    if (active) throw new Error("Next withdrawal allowed after 24 hours");

    const withdrawal = {
      id: nextId("wd"),
      userId: body.userId,
      amountCents,
      status: "initiated",
      creditedBackAt: null,
      createdAt: now(),
      updatedAt: now(),
    };
    state.withdrawals.push(withdrawal);
    const ledgerEntry = addLedger({
      userId: body.userId,
      saleId: null,
      withdrawalId: withdrawal.id,
      type: "WITHDRAWAL_DEBIT",
      direction: "debit",
      amountCents,
      description: `Withdrawal initiated for ${withdrawal.id}`,
    });

    return { withdrawal: presentWithdrawal(withdrawal), ledgerEntry: presentLedger(ledgerEntry) };
  }

  const withdrawalMatch = path.match(/^\/withdrawals\/(.+)\/status$/);
  if (withdrawalMatch && method === "PATCH") {
    const withdrawal = state.withdrawals.find((item) => item.id === withdrawalMatch[1]);
    if (!withdrawal) throw new Error("Withdrawal was not found");
    withdrawal.status = body.status;
    withdrawal.updatedAt = now();

    let recoveryEntry = null;
    if (["failed", "cancelled", "rejected"].includes(body.status) && !withdrawal.creditedBackAt) {
      withdrawal.creditedBackAt = now();
      recoveryEntry = addLedger({
        userId: withdrawal.userId,
        saleId: null,
        withdrawalId: withdrawal.id,
        type: "FAILED_WITHDRAWAL_CREDIT",
        direction: "credit",
        amountCents: withdrawal.amountCents,
        description: `Recovered ${body.status} withdrawal ${withdrawal.id}`,
      });
    }

    return {
      withdrawal: presentWithdrawal(withdrawal),
      recoveryEntry: recoveryEntry ? presentLedger(recoveryEntry) : null,
    };
  }

  throw new Error("Demo route is not available");
}