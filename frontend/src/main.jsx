import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CheckCircle2, RefreshCcw, XCircle } from "lucide-react";
import { demoApi } from "./demoEngine.js";
import iconSheet from "./assets/payout-icon-sheet.png";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api";
const USER_ID = "john_doe";

function rupees(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

async function api(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
      ...options,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message ?? "Request failed");
    }

    return data;
  } catch (error) {
    return demoApi(path, options);
  }
}

function App() {
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [notice, setNotice] = useState("Ready to run the payout flow.");
  const [loading, setLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("10");

  async function refresh() {
    const [balanceData, salesData, ledgerData, withdrawalData] = await Promise.all([
      api(`/users/${USER_ID}/balance`),
      api("/sales"),
      api(`/users/${USER_ID}/ledger`),
      api(`/withdrawals?userId=${USER_ID}`),
    ]);

    setSummary(balanceData.summary);
    setSales(salesData.sales);
    setLedger(ledgerData.entries);
    setWithdrawals(withdrawalData.withdrawals);
  }

  async function runAction(action, successMessage) {
    try {
      setLoading(true);
      await action();
      await refresh();
      setNotice(successMessage);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch((error) => setNotice(error.message));
  }, []);

  const settlement = useMemo(() => {
    return ledger.reduce((total, entry) => {
      if (!["FINAL_PAYOUT", "REJECTION_ADJUSTMENT"].includes(entry.type)) return total;
      return entry.direction === "credit" ? total + entry.amount.rupees : total - entry.amount.rupees;
    }, 0);
  }, [ledger]);

  const latestWithdrawal = withdrawals[0];

  return (
    <main className="shell">
      <section className="hero-panel">
        <nav className="topbar">
          <div className="brand-mark">
            <span>pf</span>
          </div>
          <div>
            <p className="eyebrow">Creator commerce wallet</p>
            <h1>Payout Console</h1>
          </div>
          <button className="ghost-button" onClick={() => runAction(() => api("/demo/reset", { method: "POST" }), "Demo data reset.")} disabled={loading}>
            <RefreshCcw size={16} />
            Reset workspace
          </button>
        </nav>

        <div className="hero-grid">
          <div className="wallet-card">
            <div className="card-head">
              <ImgIcon name="wallet" size="small" />
              <span>Available balance</span>
            </div>
            <strong>{rupees(summary?.availableBalance?.rupees)}</strong>
            <p>{summary?.withdrawalCooldown?.locked ? "Withdrawal window is cooling down." : "Ready for the next eligible withdrawal."}</p>
            <div className="pulse-row">
              <span /> Ledger-backed balance
            </div>
          </div>

          <MetricCard icon="ledger" label="Pending earnings" value={rupees(summary?.pendingEarnings?.rupees)} tone="mint" />
          <MetricCard icon="advance" label="Advance paid" value={rupees(summary?.advancePaid?.rupees)} tone="sun" />
          <MetricCard icon="shield" label="Final settlement" value={rupees(settlement)} tone="ink" />
        </div>
      </section>

      <section className="action-strip">
        <button
          className="primary-button"
          onClick={() => runAction(() => api("/payouts/advance/run", { method: "POST", body: JSON.stringify({ userId: USER_ID }) }), "Advance payout job finished.")}
          disabled={loading}
        >
          <ImgIcon name="advance" size="tiny" />
          Run advance payout
        </button>
        <p>{notice}</p>
      </section>

      <section className="content-grid">
        <div className="panel wide">
          <div className="section-title">
            <div>
              <p className="eyebrow">Affiliate sales</p>
              <h2>Reconciliation Queue</h2>
            </div>
            <ImgIcon name="wallet" size="small" />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sale</th>
                  <th>Brand</th>
                  <th>Earning</th>
                  <th>Advance</th>
                  <th>Status</th>
                  <th>Admin action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.id}</td>
                    <td>{sale.brandId}</td>
                    <td>{rupees(sale.earning.rupees)}</td>
                    <td>{rupees(sale.advancePaid.rupees)}</td>
                    <td><StatusBadge status={sale.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => runAction(() => api(`/sales/${sale.id}/reconcile`, { method: "POST", body: JSON.stringify({ status: "approved" }) }), `${sale.id} approved.`)} disabled={loading || sale.status !== "pending"}>
                          <CheckCircle2 size={15} />
                        </button>
                        <button onClick={() => runAction(() => api(`/sales/${sale.id}/reconcile`, { method: "POST", body: JSON.stringify({ status: "rejected" }) }), `${sale.id} rejected.`)} disabled={loading || sale.status !== "pending"}>
                          <XCircle size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Bank transfer</p>
              <h2>Withdraw</h2>
            </div>
            <ImgIcon name="advance" size="small" />
          </div>
          <label className="input-label" htmlFor="withdrawAmount">Amount</label>
          <div className="money-input">
            <span>Rs</span>
            <input id="withdrawAmount" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} />
          </div>
          <button
            className="secondary-button"
            onClick={() => runAction(() => api("/withdrawals", { method: "POST", body: JSON.stringify({ userId: USER_ID, amount: Number(withdrawAmount) }) }), "Withdrawal initiated.")}
            disabled={loading}
          >
            Start withdrawal
          </button>
          {latestWithdrawal ? (
            <div className="withdrawal-card">
              <span>Latest withdrawal</span>
              <strong>{rupees(latestWithdrawal.amount.rupees)}</strong>
              <StatusBadge status={latestWithdrawal.status} />
              <div className="recovery-actions">
                {["failed", "cancelled", "rejected", "success"].map((status) => (
                  <button
                    key={status}
                    onClick={() => runAction(() => api(`/withdrawals/${latestWithdrawal.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }), `Withdrawal marked ${status}.`)}
                    disabled={loading}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="empty-text">No withdrawals yet.</p>
          )}
        </div>

        <div className="panel wide ledger-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Audit trail</p>
              <h2>Ledger Timeline</h2>
            </div>
            <ImgIcon name="ledger" size="small" />
          </div>
          <div className="timeline">
            {ledger.length === 0 ? <p className="empty-text">Run the advance payout job to create ledger entries.</p> : null}
            {ledger.map((entry) => (
              <div className="timeline-item" key={entry.id}>
                <span className={entry.direction === "credit" ? "dot credit" : "dot debit"} />
                <div>
                  <strong>{entry.description}</strong>
                  <p>{entry.type.replaceAll("_", " ")} Ãƒâ€šÃ‚Â· {new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <b className={entry.direction}>{entry.direction === "credit" ? "+" : "-"}{rupees(entry.amount.rupees)}</b>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ icon, label, value, tone }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div><ImgIcon name={icon} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ImgIcon({ name, size = "normal" }) {
  return <span className={`img-icon ${name} ${size}`} style={{ backgroundImage: `url(${iconSheet})` }} aria-hidden="true" />;
}

function StatusBadge({ status }) {
  return <span className={`status ${status}`}>{status}</span>;
}

createRoot(document.getElementById("root")).render(<App />);
