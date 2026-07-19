import cors from "cors";
import express from "express";
import { createServices } from "./services/index.js";
import { AppError } from "./shared/errors.js";
import {
  presentLedgerEntry,
  presentSale,
  presentSummary,
  presentWithdrawal,
} from "./shared/presenter.js";

export function createApp(services = createServices()) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "postfaym-payout-system" });
  });

  app.get("/api/users", (_req, res) => {
    res.json({ users: services.store.listUsers() });
  });

  app.get("/api/brands", (_req, res) => {
    res.json({ brands: services.store.listBrands() });
  });

  app.get("/api/sales", (_req, res) => {
    res.json({ sales: services.salesService.listSales().map(presentSale) });
  });

  app.post("/api/sales", (req, res) => {
    const sale = services.salesService.createSale(req.body);
    res.status(201).json({ sale: presentSale(sale) });
  });

  app.post("/api/payouts/advance/run", (req, res) => {
    const result = services.payoutService.runAdvancePayout({ userId: req.body?.userId ?? null });
    res.json({
      ...result,
      paidSales: result.paidSales.map((item) => ({
        sale: presentSale(item.sale),
        ledgerEntry: presentLedgerEntry(item.ledgerEntry),
      })),
    });
  });

  app.post("/api/sales/:saleId/reconcile", (req, res) => {
    const result = services.salesService.reconcileSale(req.params.saleId, req.body.status, services.payoutService);
    res.json({
      sale: presentSale(result.sale),
      ledgerEntry: result.ledgerEntry ? presentLedgerEntry(result.ledgerEntry) : null,
    });
  });

  app.get("/api/users/:userId/balance", (req, res) => {
    const summary = services.balanceService.getUserSummary(req.params.userId);
    res.json({ summary: presentSummary(summary) });
  });

  app.get("/api/users/:userId/ledger", (req, res) => {
    const entries = services.ledgerService.listForUser(req.params.userId).map(presentLedgerEntry);
    res.json({ entries });
  });

  app.get("/api/withdrawals", (req, res) => {
    const withdrawals = services.withdrawalService
      .listWithdrawals(req.query.userId ?? null)
      .map(presentWithdrawal);
    res.json({ withdrawals });
  });

  app.post("/api/withdrawals", (req, res) => {
    const result = services.withdrawalService.createWithdrawal(req.body);
    res.status(201).json({
      withdrawal: presentWithdrawal(result.withdrawal),
      ledgerEntry: presentLedgerEntry(result.ledgerEntry),
    });
  });

  app.patch("/api/withdrawals/:withdrawalId/status", (req, res) => {
    const result = services.withdrawalService.updateWithdrawalStatus(req.params.withdrawalId, req.body.status);
    res.json({
      withdrawal: presentWithdrawal(result.withdrawal),
      recoveryEntry: result.recoveryEntry ? presentLedgerEntry(result.recoveryEntry) : null,
    });
  });

  app.post("/api/demo/reset", (_req, res) => {
    services.store.reset();
    res.json({ ok: true, message: "Demo data reset" });
  });

  app.use((err, _req, res, _next) => {
    const status = err instanceof AppError ? err.status : 500;
    const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
    res.status(status).json({ error: { code, message: err.message } });
  });

  return app;
}
