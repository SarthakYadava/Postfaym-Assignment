export function toPaise(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error("Amount must be a number");
  }

  return Math.round(value * 100);
}

export function fromPaise(value) {
  return Number((value / 100).toFixed(2));
}

export function formatRupees(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(fromPaise(value));
}
