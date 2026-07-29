import { createHash } from "node:crypto";
import {
  normalizeAuditScope,
  type AuditScope,
} from "@/lib/audit-scope";

export const SUPPORTED_AUDIT_REPORT_TYPES = [
  "seo",
  "technical",
  "traffic",
  "keywords",
  "competitors",
  "ai",
  "backlinks",
  "recommendations",
  "localSeo",
  "content",
  "serp",
] as const;

const supportedReportTypes = new Set<string>(
  SUPPORTED_AUDIT_REPORT_TYPES
);

export class AuditIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditIdentityError";
  }
}

type BuildAuditIdentityInput = {
  userId: string;
  url: string;
  reportTypes: unknown;
  auditConfig?: unknown;
};

export type AuditIdentity = {
  normalizedUrl: string;
  normalizedDomain: string;
  reportTypes: string[];
  auditConfig: AuditScope;
  inputHash: string;
};

function isPrivateOrLocalHostname(hostname: string) {
  const cleanHostname = hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "");

  if (
    cleanHostname === "localhost" ||
    cleanHostname.endsWith(".localhost") ||
    cleanHostname.endsWith(".local") ||
    cleanHostname === "::1" ||
    cleanHostname === "0.0.0.0"
  ) {
    return true;
  }

  if (
    cleanHostname.startsWith("10.") ||
    cleanHostname.startsWith("127.") ||
    cleanHostname.startsWith("169.254.") ||
    cleanHostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanHostname)
  ) {
    return true;
  }

  return false;
}

export function normalizeAuditReportTypes(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );

  const unsupported = normalized.filter(
    (type) => !supportedReportTypes.has(type)
  );

  if (unsupported.length > 0) {
    throw new AuditIdentityError(
      `Unsupported audit module: ${unsupported.join(", ")}`
    );
  }

  return normalized.sort((a, b) =>
    a.localeCompare(b)
  );
}

export function buildAuditIdentity({
  userId,
  url,
  reportTypes,
  auditConfig,
}: BuildAuditIdentityInput): AuditIdentity {
  const cleanUserId = String(userId || "").trim();
  const cleanInputUrl = String(url || "").trim();

  if (!cleanUserId) {
    throw new AuditIdentityError(
      "Audit user identity is required."
    );
  }

  if (!cleanInputUrl) {
    throw new AuditIdentityError(
      "Website URL is required."
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(
      /^https?:\/\//i.test(cleanInputUrl)
        ? cleanInputUrl
        : `https://${cleanInputUrl}`
    );
  } catch {
    throw new AuditIdentityError(
      "Enter a valid website URL."
    );
  }

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new AuditIdentityError(
      "Only HTTP and HTTPS website URLs are allowed."
    );
  }

  if (parsed.username || parsed.password) {
    throw new AuditIdentityError(
      "Website URLs containing credentials are not allowed."
    );
  }

  const requestHostname = parsed.hostname
    .toLowerCase()
    .replace(/\.$/, "");

  if (
    !requestHostname ||
    isPrivateOrLocalHostname(requestHostname)
  ) {
    throw new AuditIdentityError(
      "Local or private network URLs are not allowed."
    );
  }

  const normalizedDomain = requestHostname.replace(
    /^www\./,
    ""
  );

  parsed.hostname = requestHostname;
  parsed.hash = "";

  parsed.pathname =
    parsed.pathname.replace(/\/+$/, "") || "/";

  parsed.searchParams.sort();

  const normalizedUrl = parsed.toString();

  const normalizedReportTypes =
    normalizeAuditReportTypes(reportTypes);

  let normalizedAuditConfig:
    AuditScope;

  try {
    normalizedAuditConfig =
      normalizeAuditScope(
        auditConfig,
        normalizedDomain
      );
  } catch (error) {
    throw new AuditIdentityError(
      error instanceof Error
        ? error.message
        : "Invalid audit market or scope settings."
    );
  }

  if (normalizedReportTypes.length === 0) {
    throw new AuditIdentityError(
      "Select at least one audit module."
    );
  }

  /*
   * www.example.com and example.com should belong to the
   * same normalized domain, while path, query and selected
   * modules remain part of the audit identity.
   */
  const canonicalTarget = [
    parsed.protocol,
    normalizedDomain,
    parsed.port || "",
    parsed.pathname,
    parsed.search,
  ].join("|");

  const inputHash = createHash("sha256")
    .update(
      JSON.stringify({
        version: 2,
        userId: cleanUserId,
        target: canonicalTarget,
        reportTypes: normalizedReportTypes,
        auditConfig: normalizedAuditConfig,
      })
    )
    .digest("hex");

  return {
    normalizedUrl,
    normalizedDomain,
    reportTypes: normalizedReportTypes,
    auditConfig: normalizedAuditConfig,
    inputHash,
  };
}