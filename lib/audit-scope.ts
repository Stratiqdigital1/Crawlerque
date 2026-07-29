export const AUDIT_COUNTRY_OPTIONS = [
  {
    countryName: "United States",
    countryCode: "US",
    locationCode: 2840,
  },
  {
    countryName: "Pakistan",
    countryCode: "PK",
    locationCode: 2586,
  },
  {
    countryName: "India",
    countryCode: "IN",
    locationCode: 2356,
  },
  {
    countryName: "United Kingdom",
    countryCode: "GB",
    locationCode: 2826,
  },
  {
    countryName: "United Arab Emirates",
    countryCode: "AE",
    locationCode: 2784,
  },
  {
    countryName: "Canada",
    countryCode: "CA",
    locationCode: 2124,
  },
  {
    countryName: "Australia",
    countryCode: "AU",
    locationCode: 2036,
  },
] as const;

export const AUDIT_LANGUAGE_OPTIONS = [
  {
    languageName: "English",
    languageCode: "en",
  },
  {
    languageName: "Urdu",
    languageCode: "ur",
  },
  {
    languageName: "Hindi",
    languageCode: "hi",
  },
  {
    languageName: "Arabic",
    languageCode: "ar",
  },
] as const;

export const AUDIT_DEVICE_OPTIONS = [
  "mobile",
  "desktop",
] as const;

export const AUDIT_SEARCH_ENGINE_OPTIONS = [
  "google",
] as const;

export const AUDIT_CRAWL_LIMIT_OPTIONS = [
  25,
  50,
  100,
] as const;

export type AuditDevice =
  (typeof AUDIT_DEVICE_OPTIONS)[number];

export type AuditSearchEngine =
  (typeof AUDIT_SEARCH_ENGINE_OPTIONS)[number];

export type AuditScope = {
  countryName: string;
  countryCode: string;
  locationCode: number;
  languageName: string;
  languageCode: string;
  device: AuditDevice;
  os: "android" | "windows";
  searchEngine: AuditSearchEngine;
  maxCrawlPages: number;
  contentPageLimit: number;
};

export class AuditScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditScopeError";
  }
}

type ScopeInput = Record<string, unknown>;

function asRecord(
  value: unknown
): ScopeInput {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as ScopeInput;
  }

  return {};
}

function clean(
  value: unknown
) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHostname(
  target: unknown
) {
  const value = clean(target);

  if (!value) {
    return "";
  }

  try {
    return new URL(
      /^https?:\/\//i.test(value)
        ? value
        : `https://${value}`
    ).hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  } catch {
    return value
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/?#]/)[0]
      .replace(/\.$/, "");
  }
}

function detectCountryFromTarget(
  target: unknown
) {
  const hostname =
    normalizeHostname(target);

  if (hostname.endsWith(".pk")) {
    return "PK";
  }

  if (hostname.endsWith(".in")) {
    return "IN";
  }

  if (
    hostname.endsWith(".uk") ||
    hostname.endsWith(".co.uk")
  ) {
    return "GB";
  }

  if (hostname.endsWith(".ae")) {
    return "AE";
  }

  if (hostname.endsWith(".ca")) {
    return "CA";
  }

  if (hostname.endsWith(".au")) {
    return "AU";
  }

  return "US";
}

function resolveCountry(
  input: ScopeInput,
  target: unknown
) {
  const requestedName = clean(
    input.countryName ||
      input.country ||
      input.locationName
  ).toLowerCase();

  const requestedCode = clean(
    input.countryCode
  ).toUpperCase();

  const requestedLocationCode =
    Number(input.locationCode || 0);

  const detectedCode =
    detectCountryFromTarget(target);

  const country =
    AUDIT_COUNTRY_OPTIONS.find(
      (option) =>
        option.countryCode ===
          requestedCode ||
        option.locationCode ===
          requestedLocationCode ||
        option.countryName.toLowerCase() ===
          requestedName
    ) ||
    AUDIT_COUNTRY_OPTIONS.find(
      (option) =>
        option.countryCode ===
        detectedCode
    ) ||
    AUDIT_COUNTRY_OPTIONS[0];

  return country;
}

function resolveLanguage(
  input: ScopeInput
) {
  const requestedName = clean(
    input.languageName ||
      input.language
  ).toLowerCase();

  const requestedCode = clean(
    input.languageCode
  ).toLowerCase();

  return (
    AUDIT_LANGUAGE_OPTIONS.find(
      (option) =>
        option.languageCode ===
          requestedCode ||
        option.languageName.toLowerCase() ===
          requestedName
    ) ||
    AUDIT_LANGUAGE_OPTIONS[0]
  );
}

function resolveDevice(
  value: unknown
): AuditDevice {
  const device = clean(value)
    .toLowerCase();

  return device === "desktop"
    ? "desktop"
    : "mobile";
}

function resolveSearchEngine(
  value: unknown
): AuditSearchEngine {
  const searchEngine = clean(value)
    .toLowerCase() || "google";

  if (searchEngine !== "google") {
    throw new AuditScopeError(
      "Google is currently the supported search engine for complete Crawler Que audits."
    );
  }

  return "google";
}

function resolveCrawlLimit(
  value: unknown
) {
  const requested = Number(
    value || 100
  );

  if (!Number.isFinite(requested)) {
    return 100;
  }

  if (requested <= 25) {
    return 25;
  }

  if (requested <= 50) {
    return 50;
  }

  return 100;
}

function resolveContentLimit(
  value: unknown
) {
  const requested = Number(
    value || 10
  );

  if (!Number.isFinite(requested)) {
    return 10;
  }

  return Math.min(
    20,
    Math.max(1, Math.round(requested))
  );
}

export function normalizeAuditScope(
  value: unknown,
  target: unknown
): AuditScope {
  const outer = asRecord(value);
  const nested = asRecord(
    outer.auditConfig ||
      outer.auditScope ||
      outer.searchContext
  );

  const input = {
    ...outer,
    ...nested,
  };

  const country =
    resolveCountry(input, target);

  const language =
    resolveLanguage(input);

  const device = resolveDevice(
    input.device
  );

  const searchEngine =
    resolveSearchEngine(
      input.searchEngine
    );

  return {
    countryName:
      country.countryName,
    countryCode:
      country.countryCode,
    locationCode:
      country.locationCode,
    languageName:
      language.languageName,
    languageCode:
      language.languageCode,
    device,
    os:
      device === "mobile"
        ? "android"
        : "windows",
    searchEngine,
    maxCrawlPages:
      resolveCrawlLimit(
        input.maxCrawlPages ||
          input.crawlPageLimit
      ),
    contentPageLimit:
      resolveContentLimit(
        input.contentPageLimit
      ),
  };
}

export function getAuditScopeKey(
  value: unknown,
  target: unknown = ""
) {
  const scope = normalizeAuditScope(
    value,
    target
  );

  return [
    scope.countryCode,
    scope.locationCode,
    scope.languageCode,
    scope.device,
    scope.searchEngine,
    scope.maxCrawlPages,
    scope.contentPageLimit,
  ].join("|");
}
