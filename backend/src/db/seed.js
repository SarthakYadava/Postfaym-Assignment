import { toPaise } from "../shared/money.js";

export function createSeedData() {
  const now = new Date("2026-07-19T08:30:00.000Z").toISOString();

  return {
    users: [
      {
        id: "john_doe",
        name: "John Doe",
        handle: "@john_doe",
        createdAt: now,
      },
    ],
    brands: [
      { id: "brand_1", name: "Brand One" },
      { id: "brand_2", name: "Brand Two" },
      { id: "brand_3", name: "Brand Three" },
    ],
    sales: [
      {
        id: "sale_1",
        userId: "john_doe",
        brandId: "brand_1",
        status: "pending",
        earningCents: toPaise(40),
        advancePaidCents: 0,
        advancePaidAt: null,
        reconciledAt: null,
        createdAt: now,
      },
      {
        id: "sale_2",
        userId: "john_doe",
        brandId: "brand_1",
        status: "pending",
        earningCents: toPaise(40),
        advancePaidCents: 0,
        advancePaidAt: null,
        reconciledAt: null,
        createdAt: now,
      },
      {
        id: "sale_3",
        userId: "john_doe",
        brandId: "brand_1",
        status: "pending",
        earningCents: toPaise(40),
        advancePaidCents: 0,
        advancePaidAt: null,
        reconciledAt: null,
        createdAt: now,
      },
    ],
    ledgerEntries: [],
    withdrawals: [],
    idempotencyKeys: [],
  };
}
