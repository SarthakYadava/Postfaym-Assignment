# API Reference

Base URL for local development:

```text
http://localhost:4000/api
```

## Health

```http
GET /api/health
```

Returns service status.

## Users

```http
GET /api/users
```

Returns seeded users.

## Brands

```http
GET /api/brands
```

Returns seeded brands.

## Sales

```http
GET /api/sales
```

Returns all sales.

```http
POST /api/sales
Content-Type: application/json

{
  "userId": "john_doe",
  "brandId": "brand_1",
  "earning": 40
}
```

Creates a pending sale.

## Advance Payout

```http
POST /api/payouts/advance/run
Content-Type: application/json

{
  "userId": "john_doe"
}
```

Runs the advance payout job for pending sales. Each eligible sale receives a 10% credit once.

## Reconciliation

```http
POST /api/sales/sale_1/reconcile
Content-Type: application/json

{
  "status": "approved"
}
```

Allowed statuses are `approved` and `rejected`.

Approved sale:

```text
earning - advancePaid
```

Rejected sale:

```text
advancePaid is debited back as REJECTION_ADJUSTMENT
```

## Balance

```http
GET /api/users/john_doe/balance
```

Returns wallet summary, including available balance, pending earnings, advance paid, credits, debits, and withdrawal cooldown.

## Ledger

```http
GET /api/users/john_doe/ledger
```

Returns the user's ledger timeline.

## Withdrawals

```http
GET /api/withdrawals?userId=john_doe
```

Lists withdrawals.

```http
POST /api/withdrawals
Content-Type: application/json

{
  "userId": "john_doe",
  "amount": 10
}
```

Creates a withdrawal and debits the ledger.

```http
PATCH /api/withdrawals/wd_123/status
Content-Type: application/json

{
  "status": "failed"
}
```

Updates withdrawal status. `failed`, `cancelled`, and `rejected` credit the amount back once.

## Demo Reset

```http
POST /api/demo/reset
```

Restores the original assignment data.