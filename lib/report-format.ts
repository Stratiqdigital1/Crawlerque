export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatInteger(
  value: unknown,
  fallback = "Not available"
) {
  const number = toFiniteNumber(value);
  if (number === null) return fallback;

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(number);
}

export function formatCompactNumber(
  value: unknown,
  fallback = "Not available"
) {
  const number = toFiniteNumber(value);
  if (number === null) return fallback;

  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(number) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(number) >= 1000 ? 1 : 0,
  }).format(number);
}

export function formatCurrency(
  value: unknown,
  currency = "USD",
  fallback = "Not available"
) {
  const number = toFiniteNumber(value);
  if (number === null) return fallback;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: Math.abs(number) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(number) >= 1000 ? 1 : 2,
  }).format(number);
}

export function formatPercentage(
  value: unknown,
  fractionDigits = 0,
  fallback = "Not available"
) {
  const number = toFiniteNumber(value);
  if (number === null) return fallback;

  return `${number.toFixed(fractionDigits)}%`;
}
