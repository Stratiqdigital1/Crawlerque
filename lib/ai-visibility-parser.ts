export interface ParsedResponse {
  promptText: string;
  model: string;
  responseAvailable: boolean;
  brandMentioned: boolean;
  brandPosition: number | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  competitorsMentioned: string[];
  sourcesCited: string[];
  brandCitations: string[];
  rawSnippet: string;
}

const GENERIC_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "with", "from", "into",
  "best", "top", "leading", "popular", "recommended", "trusted", "quality",
  "company", "companies", "business", "businesses", "provider", "providers",
  "service", "services", "solution", "solutions", "platform", "platforms",
  "option", "options", "alternative", "alternatives", "competitor", "competitors",
  "use", "using", "used", "keep", "keeping", "maintain", "maintaining",
  "invest", "investing", "trim", "trimming", "choose", "choosing", "consider",
  "include", "including", "offer", "offers", "offering", "provides", "provide",
  "recommend", "recommends", "select", "selecting", "build", "building", "improve", "improving",
  "here", "are", "what", "which", "who", "where", "when", "why", "how",
  "these", "those", "this", "that", "they", "their", "your", "you",
  "overall", "however", "while", "known", "note", "tip", "key", "review",
  "reviews", "pricing", "price", "features", "feature", "pros", "cons",
]);

const IGNORED_DOMAINS = [
  "google.com", "youtube.com", "facebook.com", "wikipedia.org", "reddit.com",
  "amazon.com", "linkedin.com", "instagram.com", "x.com", "twitter.com",
  "tiktok.com", "pinterest.com",
];

const POSITIVE_WORDS = [
  "best", "leading", "excellent", "great", "recommended", "trusted", "reliable",
  "strong", "ideal", "robust", "affordable", "quality", "valuable", "well-known",
];

const NEGATIVE_WORDS = [
  "worst", "poor", "weak", "expensive", "limited", "outdated", "difficult",
  "unreliable", "buggy", "slow", "avoid", "drawback", "downside", "lacking",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDomain(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]
    .replace(/\.$/, "");
}

function brandVariations(brandName: string, domain = "") {
  const cleanBrand = normalizeText(brandName);
  const cleanDomain = normalizeDomain(domain);
  const rootDomain = cleanDomain.split(".")[0] || "";

  return Array.from(new Set([
    cleanBrand,
    cleanBrand.replace(/\s+/g, ""),
    cleanBrand.replace(/\s+/g, "-"),
    cleanBrand.replace(/-/g, " "),
    cleanDomain,
    rootDomain,
    rootDomain.replace(/-/g, " "),
    rootDomain.replace(/-/g, ""),
  ].filter((value) => value.length >= 3)));
}

function containsBrand(text: string, brandName: string, domain = "") {
  const normalized = normalizeText(text);
  return brandVariations(brandName, domain).some((variation) => {
    if (variation.includes(".")) {
      return normalized.includes(variation);
    }

    const pattern = new RegExp(`\\b${escapeRegExp(variation)}\\b`, "i");
    return pattern.test(normalized);
  });
}

function splitSentences(text: string) {
  return String(text || "")
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function isGenericCandidate(value: string) {
  const normalized = normalizeText(value);
  if (!normalized || normalized.length < 3 || normalized.length > 60) return true;

  const words = normalized.split(" ").filter(Boolean);
  if (words.length > 5) return true;
  if (words.every((word) => GENERIC_WORDS.has(word))) return true;
  if (words.length === 1 && GENERIC_WORDS.has(words[0])) return true;
  if (/^(yes|no|none|unknown|various|several|other)$/i.test(normalized)) return true;

  return false;
}

export function extractBrandLikeNames(text: string): string[] {
  const found = new Set<string>();
  const raw = String(text || "");

  const domains = raw.match(/\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.(?:com|net|org|io|co|ai|us|pk|uk|ca|ae|au|in))\b/gi) || [];
  domains.forEach((domain) => {
    const normalized = normalizeDomain(domain);
    if (normalized && !IGNORED_DOMAINS.some((ignored) => normalized.endsWith(ignored))) {
      found.add(normalized);
    }
  });

  const capitalized = raw.match(/\b([A-Z][A-Za-z0-9&'’-]+(?:\s+[A-Z][A-Za-z0-9&'’-]+){0,3})\b/g) || [];
  capitalized.forEach((candidate) => {
    const cleaned = candidate.trim().replace(/[,:;.!?]+$/, "");
    if (!isGenericCandidate(cleaned)) found.add(cleaned);
  });

  return Array.from(found);
}

export function detectBrand(response: string, brandName: string, domain = "") {
  const raw = String(response || "");
  if (!containsBrand(raw, brandName, domain)) {
    return {
      mentioned: false,
      position: null as number | null,
      snippet: null as string | null,
    };
  }

  const normalizedResponse = normalizeText(raw);
  const variations = brandVariations(brandName, domain);
  let firstIndex = Number.POSITIVE_INFINITY;

  variations.forEach((variation) => {
    const index = normalizedResponse.indexOf(variation);
    if (index >= 0) firstIndex = Math.min(firstIndex, index);
  });

  const beforeBrand = Number.isFinite(firstIndex)
    ? raw.slice(0, firstIndex)
    : "";

  const distinctNamesBefore = extractBrandLikeNames(beforeBrand)
    .filter((name) => !containsBrand(name, brandName, domain));

  // The product displays rank on a 1-5 scale. Anything beyond fifth place is
  // treated as position five rather than creating impossible values such as 13.2/5.
  const position = Math.min(5, Math.max(1, distinctNamesBefore.length + 1));

  const snippet = splitSentences(raw).find((sentence) =>
    containsBrand(sentence, brandName, domain)
  ) || null;

  return { mentioned: true, position, snippet };
}

export function extractBrandCitations(response: string, domain: string): string[] {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) return [];

  const output = new Set<string>();
  const raw = String(response || "");

  const urls = raw.match(/https?:\/\/[^\s)\]}>,]+/gi) || [];
  urls.forEach((url) => {
    if (normalizeDomain(url).endsWith(normalizedDomain)) {
      output.add(url.replace(/[).,;]+$/, ""));
    }
  });

  const domainPattern = new RegExp(
    `\\b(?:www\\.)?${escapeRegExp(normalizedDomain)}(?:/[\\w%./?=&-]*)?`,
    "gi"
  );

  const bareMatches = raw.match(domainPattern) || [];
  bareMatches.forEach((match) => output.add(match.replace(/[).,;]+$/, "")));

  return Array.from(output).slice(0, 5);
}

export function knowsBrand(response: string, brandName: string, domain: string): boolean {
  const raw = String(response || "");
  const normalized = normalizeText(raw);
  if (normalized.length < 50) return false;

  const disclaimers = [
    "i could not find", "i couldn't find", "i do not have", "i don't have",
    "not aware of", "no information", "unable to find", "not familiar",
    "does not appear", "doesn't appear", "cannot find", "no specific information",
  ];

  return containsBrand(raw, brandName, domain) &&
    !disclaimers.some((disclaimer) => normalized.includes(disclaimer));
}

function normalizeKnownCompetitor(value: string) {
  const domain = normalizeDomain(value);
  if (domain.includes(".")) return domain;
  return String(value || "").trim();
}

export function extractCompetitors(
  response: string,
  brandName: string,
  knownCompetitors: string[] = [],
  domain = ""
): string[] {
  const raw = String(response || "");
  const normalizedResponse = normalizeText(raw);
  const output = new Map<string, string>();

  const addCandidate = (candidate: string) => {
    const normalizedCandidate = normalizeKnownCompetitor(candidate);
    const key = normalizeText(normalizedCandidate);

    if (!key || isGenericCandidate(normalizedCandidate)) return;
    if (containsBrand(normalizedCandidate, brandName, domain)) return;
    if (IGNORED_DOMAINS.some((ignored) => normalizeDomain(normalizedCandidate).endsWith(ignored))) return;

    output.set(key, normalizedCandidate);
  };

  knownCompetitors.forEach((competitor) => {
    const normalizedCompetitor = normalizeKnownCompetitor(competitor);
    const root = normalizeDomain(normalizedCompetitor).split(".")[0];
    const candidateText = normalizeText(normalizedCompetitor);

    if (
      candidateText &&
      (normalizedResponse.includes(candidateText) || (root.length >= 4 && normalizedResponse.includes(root)))
    ) {
      addCandidate(normalizedCompetitor);
    }
  });

  extractBrandLikeNames(raw).forEach(addCandidate);

  return Array.from(output.values()).slice(0, 12);
}

export function extractSources(response: string): string[] {
  const raw = String(response || "");
  const output = new Set<string>();

  const urls = raw.match(/https?:\/\/[^\s)\]}>,]+/gi) || [];
  urls.forEach((url) => output.add(url.replace(/[).,;]+$/, "")));

  const domains = raw.match(/\b(?:www\.)?[a-z0-9-]+\.(?:com|net|org|io|co|ai|gov|edu|pk|uk|ca|ae|au|in)\b/gi) || [];
  domains.forEach((domain) => output.add(normalizeDomain(domain)));

  return Array.from(output).slice(0, 10);
}

export function detectSentiment(snippet: string | null): "positive" | "neutral" | "negative" | null {
  if (!snippet) return null;

  const normalized = normalizeText(snippet);
  let score = 0;

  POSITIVE_WORDS.forEach((word) => {
    if (normalized.includes(word)) score += 1;
  });

  NEGATIVE_WORDS.forEach((word) => {
    if (normalized.includes(word)) score -= 1;
  });

  return score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
}

export function parseResponse(
  rawResponse: string,
  promptText: string,
  model: string,
  brandName: string,
  domain: string,
  knownCompetitors: string[] = []
): ParsedResponse {
  const responseAvailable = String(rawResponse || "").trim().length >= 20;
  const { mentioned, position, snippet } = responseAvailable
    ? detectBrand(rawResponse, brandName, domain)
    : { mentioned: false, position: null, snippet: null };

  return {
    promptText,
    model,
    responseAvailable,
    brandMentioned: mentioned,
    brandPosition: position,
    sentiment: mentioned ? detectSentiment(snippet) : null,
    competitorsMentioned: responseAvailable
      ? extractCompetitors(rawResponse, brandName, knownCompetitors, domain)
      : [],
    sourcesCited: responseAvailable ? extractSources(rawResponse) : [],
    brandCitations: responseAvailable ? extractBrandCitations(rawResponse, domain) : [],
    rawSnippet: snippet || "",
  };
}
