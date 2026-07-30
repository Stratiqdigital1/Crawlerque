const REFERENCE_PATTERN = /\bCQ-[A-Z0-9-]+\b/i;

function extractMessage(value: unknown): string {
  if (value instanceof Error) return value.message;

  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.error === "string") {
      return record.error;
    }

    if (
      record.error &&
      typeof record.error === "object" &&
      typeof (record.error as Record<string, unknown>).message === "string"
    ) {
      return String(
        (record.error as Record<string, unknown>).message
      );
    }

    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return "";
}

function extractReference(message: string) {
  return message.match(REFERENCE_PATTERN)?.[0]?.toUpperCase() || "";
}

export function getPublicErrorMessage(
  value: unknown,
  fallback = "Something went wrong. Please try again."
) {
  const raw = extractMessage(value)
    .replace(/\s+/g, " ")
    .trim();

  const reference = extractReference(raw);
  const withReference = (message: string) =>
    reference && !message.includes(reference)
      ? `${message} Reference: ${reference}.`
      : message;

  if (!raw) return withReference(fallback);

  if (/please (log|sign) in|unauthori[sz]ed/i.test(raw)) {
    return withReference("Please sign in and try again.");
  }

  if (/monthly audit limit|daily audit limit|audit limit reached/i.test(raw)) {
    return withReference(raw.slice(0, 240));
  }

  if (/credit was restored|audit cancelled|promotional access/i.test(raw)) {
    return withReference(raw.slice(0, 240));
  }

  if (/report not found/i.test(raw)) {
    return withReference("The requested report could not be found.");
  }

  if (/approve.*client-facing review|approved client report/i.test(raw)) {
    return withReference(
      "Approve the current client-facing review before exporting the PDF."
    );
  }

  if (/identity.*mismatch|did not match the reserved job/i.test(raw)) {
    return withReference(
      "The audit request no longer matches the reserved job. Start a new audit."
    );
  }

  if (/technical crawl/i.test(raw)) {
    return withReference(
      "The technical crawl could not be completed. Retry the audit or check the saved attempt."
    );
  }

  const looksInternal =
    raw.length > 240 ||
    /^[{\[]/.test(raw) ||
    /node_modules|prisma|sql|syntaxerror|unexpected token|stack trace|at\s+\w+\s*\(|<\/?html|\.tsx?:\d+|ECONN|ENOTFOUND|ETIMEDOUT/i.test(
      raw
    );

  if (looksInternal) {
    return withReference(fallback);
  }

  return withReference(raw);
}
