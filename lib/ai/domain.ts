export function normalizeDomain(input: string): string {
  let value = input.trim().toLowerCase();

  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    value = `https://${value}`;
  }

  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    throw new Error("Invalid domain");
  }
}

export function guessBrandFromDomain(domain: string): string {
  const root = domain.split(".")[0] || domain;
  return root
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}