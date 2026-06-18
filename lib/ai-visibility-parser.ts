// lib/ai-visibility-parser.ts  (UPDATED — brand fragments no longer counted as competitors)
export interface ParsedResponse {
  promptText: string;
  model: string;
  brandMentioned: boolean;
  brandPosition: number | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  competitorsMentioned: string[];
  sourcesCited: string[];
  rawSnippet: string;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "best", "top", "this", "that", "these", "those", "it", "its",
  "however", "overall", "for", "with", "and", "or", "but", "you", "your", "they",
  "their", "what", "which", "when", "where", "why", "how", "here", "there",
  "small", "businesses", "business", "companies", "company", "startups", "teams",
  "free", "plan", "plans", "we", "our", "us", "one", "two", "three", "also",
  "some", "many", "most", "more", "less", "good", "great", "popular", "options",
  "pros", "cons", "note", "tip", "key", "if", "in", "on", "of", "to", "is", "are",
]);

const IGNORE_BRANDS = ["google", "youtube", "facebook", "wikipedia", "reddit", "amazon", "gmail", "linkedin"];

function brandVariations(brandName: string): string[] {
  const b = String(brandName || "").toLowerCase().trim();
  return Array.from(
    new Set(
      [
        b,
        b.replace(/\s+/g, ""),
        b.replace(/-/g, " "),
        b.replace(/\s+/g, "-"),
        b.replace(/\.(com|net|org|io|co|ai|us|pk)$/i, ""),
      ].filter(Boolean)
    )
  );
}

// Distinct brand tokens of length >= 4 (e.g. "stratiq", "digital").
function brandTokens(brandName: string): string[] {
  return String(brandName || "")
    .toLowerCase()
    .split(/[\s.-]+/)
    .filter((t) => t.length >= 4);
}

function splitSentences(text: string): string[] {
  return String(text || "")
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function extractBrandLikeNames(text: string): string[] {
  const found = new Set<string>();
  const t = String(text || "");

  (t.match(/\b([a-z0-9-]+\.(com|net|org|io|co|ai|us|pk))\b/gi) || []).forEach((d) =>
    found.add(d.toLowerCase())
  );

  (t.match(/\b([A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+){0,2})\b/g) || []).forEach((w) => {
    if (!STOP_WORDS.has(w.toLowerCase())) found.add(w.trim());
  });

  return Array.from(found);
}

export function detectBrand(
  response: string,
  brandName: string
): { mentioned: boolean; position: number | null; snippet: string | null } {
  const lower = String(response || "").toLowerCase();
  const variations = brandVariations(brandName);
  const tokens = brandTokens(brandName);

  // Mentioned if a full variation appears, OR all brand tokens appear somewhere.
  const mentioned =
    variations.some((v) => v && lower.includes(v)) ||
    (tokens.length > 0 && tokens.every((t) => lower.includes(t)));

  if (!mentioned) return { mentioned: false, position: null, snippet: null };

  let brandIndex = Infinity;
  for (const v of [...variations, ...tokens]) {
    if (!v) continue;
    const idx = lower.indexOf(v);
    if (idx >= 0 && idx < brandIndex) brandIndex = idx;
  }

  const namesBefore = extractBrandLikeNames(
    response.slice(0, brandIndex === Infinity ? 0 : brandIndex)
  );
  const position = namesBefore.length + 1;

  const sentences = splitSentences(response);
  const snippet =
    sentences.find(
      (s) =>
        variations.some((v) => v && s.toLowerCase().includes(v)) ||
        (tokens.length > 0 && tokens.every((t) => s.toLowerCase().includes(t)))
    ) || null;

  return { mentioned: true, position, snippet };
}

export function extractCompetitors(
  response: string,
  brandName: string,
  knownCompetitors: string[] = []
): string[] {
  const out = new Set<string>();
  const brandVars = brandVariations(brandName);
  const tokens = brandTokens(brandName);

  // A candidate is "the brand itself" if it matches a variation OR contains any brand token.
  const isBrand = (s: string) => {
    const ls = s.toLowerCase();
    return brandVars.some((v) => v && ls.includes(v)) || tokens.some((t) => ls.includes(t));
  };

  const lowerResp = String(response || "").toLowerCase();

  knownCompetitors.forEach((c) => {
    if (c && lowerResp.includes(String(c).toLowerCase()) && !isBrand(c)) out.add(String(c));
  });

  extractBrandLikeNames(response).forEach((n) => {
    const ln = n.toLowerCase();
    if (!isBrand(n) && !IGNORE_BRANDS.some((g) => ln.includes(g))) out.add(n);
  });

  return Array.from(out).slice(0, 15);
}

export function extractSources(response: string): string[] {
  const urls = String(response || "").match(/https?:\/\/[^\s)]+/g) || [];
  const domains = String(response || "").match(/\b([a-z0-9-]+\.(com|net|org|io|co|ai|gov|edu))\b/gi) || [];
  return Array.from(new Set([...urls, ...domains.map((d) => d.toLowerCase())])).slice(0, 10);
}

const POSITIVE = ["best", "leading", "top", "excellent", "great", "popular", "recommended", "trusted", "powerful", "reliable", "strong", "favorite", "ideal", "robust", "seamless", "intuitive", "affordable", "versatile"];
const NEGATIVE = ["worst", "poor", "weak", "expensive", "limited", "lacking", "outdated", "difficult", "complicated", "unreliable", "buggy", "slow", "avoid", "drawback", "downside"];

export function detectSentiment(snippet: string | null): "positive" | "neutral" | "negative" | null {
  if (!snippet) return null;
  const s = snippet.toLowerCase();
  let score = 0;
  POSITIVE.forEach((w) => { if (s.includes(w)) score += 1; });
  NEGATIVE.forEach((w) => { if (s.includes(w)) score -= 1; });
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

export function parseResponse(
  rawResponse: string,
  promptText: string,
  model: string,
  brandName: string,
  knownCompetitors: string[] = []
): ParsedResponse {
  const { mentioned, position, snippet } = detectBrand(rawResponse, brandName);
  return {
    promptText,
    model,
    brandMentioned: mentioned,
    brandPosition: position,
    sentiment: mentioned ? detectSentiment(snippet) : null,
    competitorsMentioned: extractCompetitors(rawResponse, brandName, knownCompetitors),
    sourcesCited: extractSources(rawResponse),
    rawSnippet: snippet || "",
  };
}