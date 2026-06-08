export const LOCATION_CODES: Record<string, number> = {
  US: 2840,
  PK: 2586,
  BD: 2050,
  IN: 2356,
  GB: 2826,
  AU: 2036,
  CA: 2124,
  AE: 2784,
};

export const DEFAULT_LOCATION_CODE = 2840;

export function getLocationCode(domain: string): number {
  const cleanDomain = String(domain || "").toLowerCase();

  if (cleanDomain.endsWith(".pk")) return 2586;
  if (cleanDomain.endsWith(".bd")) return 2050;
  if (cleanDomain.endsWith(".in")) return 2356;

  if (
    cleanDomain.endsWith(".co.uk") ||
    cleanDomain.endsWith(".uk")
  ) {
    return 2826;
  }

  if (
    cleanDomain.endsWith(".com.au") ||
    cleanDomain.endsWith(".au")
  ) {
    return 2036;
  }

  if (cleanDomain.endsWith(".ca")) return 2124;
  if (cleanDomain.endsWith(".ae")) return 2784;

  return DEFAULT_LOCATION_CODE;
}

// Backward compatibility exports
export const LOCATION_CODE = DEFAULT_LOCATION_CODE;
export const LANGUAGE_CODE = "en";