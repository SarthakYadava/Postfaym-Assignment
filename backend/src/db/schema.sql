CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  brand_id TEXT NOT NULL REFERENCES brands(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  earning_cents INTEGER NOT NULL CHECK (earning_cents > 0),
  advance_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (advance_paid_cents >= 0),
  advance_paid_at TEXT,
  reconciled_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_sales_user_status ON sales(user_id, status);
CREATE INDEX idx_sales_brand ON sales(brand_id);

CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  sale_id TEXT REFERENCES sales(id),
  withdrawal_id TEXT,
  type TEXT NOT NULL CHECK (
    type IN (
      'ADVANCE_PAYOUT',
      'FINAL_PAYOUT',
      'REJECTION_ADJUSTMENT',
      'WITHDRAWAL_DEBIT',
      'FAILED_WITHDRAWAL_CREDIT'
    )
  ),
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  description TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX idx_ledger_user_created ON ledger_entries(user_id, created_at);
CREATE INDEX idx_ledger_sale ON ledger_entries(sale_id);
CREATE INDEX idx_ledger_withdrawal ON ledger_entries(withdrawal_id);

CREATE TABLE withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL CHECK (
    status IN ('initiated', 'processing', 'success', 'failed', 'cancelled', 'rejected')
  ),
  credited_back_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_withdrawals_user_created ON withdrawals(user_id, created_at);

CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);
