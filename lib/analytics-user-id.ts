import { createHmac } from "node:crypto";

/**
 * Creates a stable, pseudonymous analytics identifier from the internal user ID.
 * The raw database ID, email, name, Stripe IDs, and other PII are never sent to GA4.
 */
export function getAnalyticsUserId(userId: string) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    throw new Error("A user ID is required to create an analytics ID.");
  }

  const secret =
    process.env.ANALYTICS_ID_SECRET ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "ANALYTICS_ID_SECRET or JWT_SECRET must be configured."
    );
  }

  const digest = createHmac("sha256", secret)
    .update(normalizedUserId)
    .digest("hex")
    .slice(0, 24);

  return `cqu_${digest}`;
}
