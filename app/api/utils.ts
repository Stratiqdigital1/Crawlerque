// app/api/utils.ts

export function normalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    return url.toString();
  } catch {
    return input.startsWith("http://") || input.startsWith("https://")
      ? input
      : `https://${input}`;
  }
}

export function extractDomain(input: string): string {
  try {
    return new URL(input).hostname.replace(/^www\./, "");
  } catch {
    return input.replace(/^www\./, "");
  }
}

export function absoluteUrl(base: string, relative: string): string | null {
  try {
    if (!relative || relative.startsWith("#")) return null;
    if (
      relative.startsWith("mailto:") ||
      relative.startsWith("tel:") ||
      relative.startsWith("javascript:")
    ) {
      return null;
    }

    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

export function isInternalUrl(domain: string, href: string): boolean {
  try {
    const linkDomain = new URL(href).hostname.replace(/^www\./, "");
    const cleanDomain = domain.replace(/^www\./, "");
    return linkDomain === cleanDomain || linkDomain.endsWith(`.${cleanDomain}`);
  } catch {
    return false;
  }
}

export function safeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

export function dedupeStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

export function getMetricDisplay(
  audits: Record<string, any>,
  key: string,
  fallbackUnit = ""
): string {
  const audit = audits?.[key];

  if (audit?.displayValue) {
    return String(audit.displayValue);
  }

  const value = audit?.numericValue;

  if (typeof value !== "number") {
    return "--";
  }

  if (fallbackUnit === "s") {
    return `${(value / 1000).toFixed(1)}s`;
  }

  if (fallbackUnit === "ms") {
    return `${Math.round(value)}ms`;
  }

  return String(value);
}

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; StratIQAuditBot/1.0; +https://stratiqdigital.com)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch page HTML (${res.status})`);
  }

  return await res.text();
}