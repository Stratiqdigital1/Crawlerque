export type BusinessContextConfidence = "high" | "medium" | "low";

export type BusinessContext = {
  brandName: string;
  categoryKey: string;
  categoryLabel: string;
  primaryService: string;
  coreTokens: string[];
  categoryKeywords: string[];
  serpKeywords: string[];
  localQueryService: string;
  confidence: BusinessContextConfidence;
  confidenceScore: number;
  matchedSignals: string[];
  source: "homepage-context";
};

type BuildBusinessContextInput = {
  html?: string;
  title?: string;
  description?: string;
  h1?: string;
  bodyText?: string;
  domain: string;
};

type CategoryDefinition = {
  key: string;
  label: string;
  primaryService: string;
  coreTokens: string[];
  categoryKeywords: string[];
  serpKeywords?: string[];
  localQueryService?: string;
  phrases: string[];
  broadPhrases?: string[];
};

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: "saas_link_building",
    label: "SaaS Link Building",
    primaryService: "SaaS link building services",
    coreTokens: [
      "saas",
      "link building",
      "backlink",
      "backlinks",
      "outreach",
      "guest post",
      "guest posting",
    ],
    categoryKeywords: [
      "saas link building agencies",
      "saas link building services",
      "b2b saas link building",
      "saas backlink services",
      "link building agency for saas",
      "saas outreach services",
    ],
    serpKeywords: [
      "saas link building agency",
      "saas link building services",
      "b2b saas link building",
      "saas backlink services",
    ],
    localQueryService: "SaaS link building agency",
    phrases: [
      "saas link building",
      "b2b saas link building",
      "saas backlink",
      "saas backlinks",
      "saas guest posting",
      "link building for saas",
      "backlinks for saas",
    ],
    broadPhrases: [
      "link building agency",
      "link building services",
      "backlink agency",
      "backlink services",
      "guest posting services",
    ],
  },
  {
    key: "seo_audit_intelligence",
    label: "SEO Audit & Website Growth Intelligence",
    primaryService: "SEO audit and website growth intelligence",
    coreTokens: [
      "seo audit",
      "website audit",
      "ai visibility",
      "core web vitals",
      "technical seo",
      "competitor gaps",
      "website growth",
    ],
    categoryKeywords: [
      "seo audit tools",
      "website audit tools",
      "ai seo audit tools",
      "website growth intelligence tools",
      "technical seo audit tools",
      "ai visibility audit tools",
    ],
    serpKeywords: [
      "seo audit tool",
      "website audit tool",
      "ai seo audit tool",
      "technical seo audit tool",
    ],
    localQueryService: "SEO audit tool",
    phrases: [
      "seo audit tool",
      "website audit tool",
      "ai visibility scoring",
      "website growth intelligence",
      "complete seo audit",
      "technical seo audit",
      "seo scores",
      "client ready report",
      "client-ready report",
    ],
    broadPhrases: [
      "seo audit",
      "website audit",
      "ai visibility",
      "core web vitals",
      "competitor gaps",
    ],
  },
  {
    key: "seo_agency",
    label: "SEO Services",
    primaryService: "SEO services",
    coreTokens: ["seo", "search engine optimization", "organic search", "technical seo"],
    categoryKeywords: [
      "seo agencies",
      "seo services",
      "search engine optimization companies",
      "technical seo agency",
      "organic search agency",
    ],
    serpKeywords: ["seo agency", "seo services", "technical seo agency", "organic search agency"],
    localQueryService: "SEO agency",
    phrases: [
      "seo agency",
      "seo services",
      "search engine optimization agency",
      "search engine optimisation agency",
      "technical seo services",
    ],
  },
  {
    key: "healthcare_software_development",
    label: "Healthcare Software Development",
    primaryService: "healthcare software development",
    coreTokens: [
      "healthcare software",
      "healthcare app",
      "medical software",
      "medical device",
      "samd",
      "digital health",
      "healthtech",
      "clinical software",
    ],
    categoryKeywords: [
      "healthcare software development",
      "custom healthcare software development",
      "healthcare software development companies",
      "healthcare app development companies",
      "SaMD development services",
      "medical device software development",
      "AI healthcare software development",
    ],
    serpKeywords: [
      "healthcare software development company",
      "custom healthcare software development",
      "SaMD development services",
      "medical device software development",
    ],
    localQueryService: "healthcare software development company",
    phrases: [
      "healthcare software development",
      "healthcare technology development",
      "healthcare technology development company",
      "healthcare app development",
      "medical device software",
      "medical devices",
      "software as a medical device",
      "samd development",
      "samd",
      "digital health software",
      "digital health",
      "healthtech development",
      "ai healthcare software",
      "xr solutions for healthcare",
    ],
  },
  {
    key: "creator_subscription_platform",
    label: "Creator Subscription Platform",
    primaryService: "creator subscription platform",
    coreTokens: [
      "creator subscription",
      "paid creator content",
      "exclusive creator content",
      "fan subscription",
      "creator monetization",
      "creator monetisation",
    ],
    categoryKeywords: [
      "creator subscription platforms",
      "paid content platforms for creators",
      "exclusive creator content platforms",
      "fan subscription platforms",
      "creator monetization platforms",
    ],
    serpKeywords: [
      "creator subscription platform",
      "paid content platform for creators",
      "fan subscription platform",
      "creator monetization platform",
    ],
    localQueryService: "creator subscription platform",
    phrases: [
      "creator subscription",
      "subscription content platform",
      "paid creator content",
      "exclusive creator content",
      "fan subscription platform",
      "creator monetization",
      "creator monetisation",
    ],
  },
  {
    key: "amazon_marketing",
    label: "Amazon Marketing",
    primaryService: "Amazon marketing services",
    coreTokens: ["amazon ppc", "amazon seo", "amazon advertising", "amazon seller", "amazon listing"],
    categoryKeywords: [
      "amazon marketing agencies",
      "amazon ppc management services",
      "amazon seo services",
      "amazon advertising agencies",
      "amazon listing optimization services",
    ],
    serpKeywords: [
      "amazon marketing agency",
      "amazon ppc management",
      "amazon seo services",
      "amazon listing optimization",
    ],
    localQueryService: "Amazon marketing agency",
    phrases: [
      "amazon ppc",
      "amazon seo",
      "amazon advertising",
      "amazon seller services",
      "amazon listing optimization",
      "amazon listing optimisation",
    ],
  },
  {
    key: "custom_software_development",
    label: "Custom Software Development",
    primaryService: "custom software development",
    coreTokens: [
      "custom software",
      "software development",
      "application development",
      "app development",
      "product development",
    ],
    categoryKeywords: [
      "custom software development companies",
      "software development services",
      "application development companies",
      "digital product development agencies",
    ],
    serpKeywords: [
      "custom software development company",
      "software development services",
      "application development company",
      "digital product development agency",
    ],
    localQueryService: "custom software development company",
    phrases: [
      "custom software development",
      "software development company",
      "software development services",
      "application development",
      "web application development",
      "digital product development",
    ],
  },
  {
    key: "digital_marketing",
    label: "Digital Marketing",
    primaryService: "digital marketing services",
    coreTokens: ["digital marketing", "ppc", "paid media", "social media marketing", "performance marketing"],
    categoryKeywords: [
      "digital marketing agencies",
      "digital marketing services",
      "performance marketing agencies",
      "ppc management services",
      "paid media agencies",
    ],
    serpKeywords: ["digital marketing agency", "digital marketing services", "performance marketing agency", "ppc agency"],
    localQueryService: "digital marketing agency",
    phrases: [
      "digital marketing agency",
      "digital marketing services",
      "performance marketing agency",
      "ppc agency",
      "paid media agency",
    ],
  },
  {
    key: "mens_grooming_beard_care",
    label: "Men's Grooming & Beard Care",
    primaryService: "men's grooming and beard care products",
    coreTokens: [
      "beard care",
      "beard products",
      "beard oil",
      "beard balm",
      "men's grooming",
      "mens grooming",
      "hair care",
      "skin care",
      "grooming",
    ],
    categoryKeywords: [
      "men's grooming products",
      "beard care products",
      "beard grooming products",
      "beard oil and balm",
      "men's hair and skin care",
    ],
    serpKeywords: [
      "beard care products",
      "men's grooming products",
      "beard grooming products",
      "beard oil and balm",
    ],
    localQueryService: "men's grooming and beard care",
    phrases: [
      "beard products",
      "beard care",
      "beard oil",
      "beard balm",
      "men's grooming",
      "mens grooming",
      "hair and skin products",
      "grooming routine",
      "beard hair and skin",
    ],
    broadPhrases: [
      "grooming products",
      "hair care",
      "skin care",
      "beard",
    ],
  },
  {
    key: "ecommerce",
    label: "Ecommerce",
    primaryService: "ecommerce products and services",
    coreTokens: ["ecommerce", "online store", "shopify", "shopping", "products"],
    categoryKeywords: ["ecommerce stores", "online shopping", "shopify stores", "ecommerce products"],
    serpKeywords: ["ecommerce store", "online shopping", "shopify store"],
    localQueryService: "ecommerce store",
    phrases: ["ecommerce", "e-commerce", "online store", "shopify store"],
  },
  {
    key: "saas_product",
    label: "SaaS Software",
    primaryService: "business software",
    coreTokens: ["saas", "software platform", "cloud software", "business software"],
    categoryKeywords: ["business software", "saas platforms", "cloud software", "software platforms"],
    serpKeywords: ["business software", "saas platform", "cloud software"],
    localQueryService: "business software company",
    phrases: ["saas platform", "software as a service", "cloud software", "business software"],
  },
  {
    key: "real_estate",
    label: "Real Estate Services",
    primaryService: "real estate services",
    coreTokens: ["real estate", "realtor", "brokerage", "property management"],
    categoryKeywords: ["real estate companies", "real estate services", "property management companies"],
    serpKeywords: ["real estate company", "real estate services", "property management company"],
    localQueryService: "real estate company",
    phrases: ["real estate", "realtor", "brokerage", "property management"],
  },
  {
    key: "legal",
    label: "Legal Services",
    primaryService: "legal services",
    coreTokens: ["law firm", "lawyer", "attorney", "legal services"],
    categoryKeywords: ["law firms", "legal services", "attorneys", "lawyers"],
    serpKeywords: ["law firm", "legal services", "attorney"],
    localQueryService: "law firm",
    phrases: ["law firm", "lawyer", "attorney", "legal services"],
  },
  {
    key: "healthcare_provider",
    label: "Healthcare Services",
    primaryService: "healthcare services",
    coreTokens: ["medical clinic", "healthcare provider", "doctor", "dental", "clinic"],
    categoryKeywords: ["healthcare providers", "medical clinics", "healthcare services"],
    serpKeywords: ["healthcare provider", "medical clinic", "healthcare services"],
    localQueryService: "healthcare provider",
    phrases: ["medical clinic", "healthcare provider", "doctor", "dental clinic", "clinic"],
  },
];

const SERVICE_WORDS = new Set([
  "agency",
  "agencies",
  "company",
  "companies",
  "service",
  "services",
  "platform",
  "software",
  "development",
  "marketing",
  "consulting",
  "consultant",
  "solutions",
  "solution",
]);

const RELEVANCE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "best",
  "by",
  "company",
  "companies",
  "for",
  "from",
  "in",
  "near",
  "of",
  "on",
  "provider",
  "providers",
  "service",
  "services",
  "solution",
  "solutions",
  "the",
  "to",
  "top",
  "with",
]);

function decodeHtmlEntities(value: string) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "));
}

function normalizeText(value: string) {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9+#.&'\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDomainRoot(domain: string) {
  return String(domain || "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .split(".")[0]
    .replace(/[-_]+/g, " ")
    .trim();
}

function smartCaseDomainBrand(domain: string) {
  let root = normalizeDomainRoot(domain);
  if (!root) return "Website";

  root = root
    .replace(/^saas/i, "SaaS")
    .replace(/^seo/i, "SEO")
    .replace(/^ai/i, "AI")
    .replace(/^crm/i, "CRM");

  if (/^(SaaS|SEO|AI|CRM)/.test(root)) {
    const prefix = root.match(/^(SaaS|SEO|AI|CRM)/)?.[0] || "";
    const rest = root.slice(prefix.length);
    return prefix + (rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : "");
  }

  return root
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getMetaContent(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const first = html.match(
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i")
  )?.[1];
  const second = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, "i")
  )?.[1];
  return decodeHtmlEntities(first || second || "");
}

function extractJsonLdNames(html: string) {
  const names: string[] = [];
  const blocks = String(html || "").match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
  ) || [];

  for (const block of blocks) {
    const jsonText = block
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();

    try {
      const data = JSON.parse(jsonText);
      const queue = Array.isArray(data) ? [...data] : [data];

      while (queue.length) {
        const item: any = queue.shift();
        if (!item || typeof item !== "object") continue;

        const type = Array.isArray(item["@type"]) ? item["@type"].join(" ") : String(item["@type"] || "");
        if (/Organization|WebSite|Corporation|LocalBusiness|ProfessionalService/i.test(type)) {
          const name = String(item?.name || "").trim();
          if (name) names.push(name);
        }

        if (Array.isArray(item["@graph"])) queue.push(...item["@graph"]);
      }
    } catch {
      // Invalid JSON-LD is ignored. Context detection must remain deterministic.
    }
  }

  return names;
}

function looksLikeServicePhrase(value: string) {
  const tokens = normalizeText(value).split(" ").filter(Boolean);
  return tokens.some((token) => SERVICE_WORDS.has(token));
}

export function extractBrandName(input: {
  html?: string;
  title?: string;
  domain: string;
}) {
  const html = String(input.html || "");
  const schemaName = extractJsonLdNames(html).find((value) => value.length >= 2 && value.length <= 70);
  if (schemaName) return schemaName;

  const siteName = getMetaContent(html, "og:site_name") || getMetaContent(html, "application-name");
  if (siteName && siteName.length <= 70) return siteName;

  const titleParts = String(input.title || "")
    .split(/[|–—:\-]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const shortBrandPart = titleParts.find(
    (part) =>
      part.length >= 2 &&
      part.length <= 32 &&
      part.split(/\s+/).length <= 4 &&
      !looksLikeServicePhrase(part)
  );

  if (shortBrandPart) return shortBrandPart;
  return smartCaseDomainBrand(input.domain);
}

function weightedPhraseScore(source: string, phrases: string[], weight: number) {
  let score = 0;
  const matched: string[] = [];

  for (const phrase of phrases) {
    const normalizedPhrase = normalizeText(phrase);
    if (normalizedPhrase && source.includes(normalizedPhrase)) {
      score += weight;
      matched.push(phrase);
    }
  }

  return { score, matched };
}

function deriveFallbackService(title: string, h1: string, description: string) {
  const candidates = [title, h1, description]
    .map((value) => decodeHtmlEntities(value).replace(/[|–—].*$/, "").trim())
    .filter((value) => value.length >= 4 && value.length <= 90);

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized.split(" ").some((token) => SERVICE_WORDS.has(token))) {
      return candidate
        .replace(/\b(best|top|leading|trusted|specialized|specialised|premium)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return "products and services";
}

function tokensFromPhrases(values: string[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => normalizeText(value).split(" "))
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !RELEVANCE_STOP_WORDS.has(token))
    )
  );
}

export function buildBusinessContext(input: BuildBusinessContextInput): BusinessContext {
  const title = decodeHtmlEntities(input.title || "");
  const description = decodeHtmlEntities(input.description || "");
  const h1 = decodeHtmlEntities(input.h1 || "");
  const bodyText = decodeHtmlEntities(input.bodyText || "");

  const sources = {
    title: normalizeText(title),
    h1: normalizeText(h1),
    description: normalizeText(description),
    body: normalizeText(bodyText.slice(0, 16000)),
  };

  const ranked = CATEGORY_DEFINITIONS.map((definition) => {
    const strong = definition.phrases;
    const broad = definition.broadPhrases || [];

    const titleStrong = weightedPhraseScore(sources.title, strong, 9);
    const h1Strong = weightedPhraseScore(sources.h1, strong, 7);
    const descStrong = weightedPhraseScore(sources.description, strong, 5);
    const bodyStrong = weightedPhraseScore(sources.body, strong, 2);

    const titleBroad = weightedPhraseScore(sources.title, broad, 4);
    const h1Broad = weightedPhraseScore(sources.h1, broad, 3);
    const descBroad = weightedPhraseScore(sources.description, broad, 2);
    const bodyBroad = weightedPhraseScore(sources.body, broad, 1);

    const score =
      titleStrong.score +
      h1Strong.score +
      descStrong.score +
      bodyStrong.score +
      titleBroad.score +
      h1Broad.score +
      descBroad.score +
      bodyBroad.score;

    const matchedSignals = Array.from(
      new Set([
        ...titleStrong.matched.map((v) => `title:${v}`),
        ...h1Strong.matched.map((v) => `h1:${v}`),
        ...descStrong.matched.map((v) => `description:${v}`),
        ...bodyStrong.matched.map((v) => `body:${v}`),
        ...titleBroad.matched.map((v) => `title:${v}`),
        ...h1Broad.matched.map((v) => `h1:${v}`),
        ...descBroad.matched.map((v) => `description:${v}`),
        ...bodyBroad.matched.map((v) => `body:${v}`),
      ])
    );

    return { definition, score, matchedSignals };
  }).sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const second = ranked[1];
  const margin = (best?.score || 0) - (second?.score || 0);

  let confidence: BusinessContextConfidence = "low";
  if ((best?.score || 0) >= 16 && margin >= 4) confidence = "high";
  else if ((best?.score || 0) >= 7) confidence = "medium";

  const brandName = extractBrandName({ html: input.html, title, domain: input.domain });

  if (best && best.score >= 4) {
    return {
      brandName,
      categoryKey: best.definition.key,
      categoryLabel: best.definition.label,
      primaryService: best.definition.primaryService,
      coreTokens: best.definition.coreTokens,
      categoryKeywords: best.definition.categoryKeywords,
      serpKeywords: best.definition.serpKeywords || best.definition.categoryKeywords.slice(0, 4),
      localQueryService: best.definition.localQueryService || best.definition.primaryService,
      confidence,
      confidenceScore: best.score,
      matchedSignals: best.matchedSignals.slice(0, 12),
      source: "homepage-context",
    };
  }

  const fallbackService = deriveFallbackService(title, h1, description);
  const fallbackTokens = tokensFromPhrases([fallbackService]);

  return {
    brandName,
    categoryKey: "general_service",
    categoryLabel: fallbackService,
    primaryService: fallbackService,
    coreTokens: fallbackTokens,
    categoryKeywords: [fallbackService],
    serpKeywords: [fallbackService],
    localQueryService: fallbackService,
    confidence: "low",
    confidenceScore: best?.score || 0,
    matchedSignals: [],
    source: "homepage-context",
  };
}

function relevanceTokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !RELEVANCE_STOP_WORDS.has(token));
}

export function keywordRelevanceScore(keyword: string, context: BusinessContext) {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return 0;

  let score = 0;

  for (const phrase of context.coreTokens) {
    const normalizedPhrase = normalizeText(phrase);
    if (!normalizedPhrase) continue;

    if (normalizedKeyword.includes(normalizedPhrase)) {
      const phraseTokenCount = relevanceTokens(normalizedPhrase).length;
      score += phraseTokenCount >= 2 ? 4 : 2;
    }
  }

  for (const phrase of context.categoryKeywords) {
    const normalizedPhrase = normalizeText(phrase);
    if (normalizedPhrase && normalizedKeyword.includes(normalizedPhrase)) {
      score += 6;
    }
  }

  const keywordTokens = new Set(relevanceTokens(normalizedKeyword));
  const contextTokens = new Set(
    relevanceTokens(
      [
        context.primaryService,
        ...context.coreTokens,
        ...context.categoryKeywords.slice(0, 3),
      ].join(" ")
    )
  );

  let tokenMatches = 0;
  keywordTokens.forEach((token) => {
    if (contextTokens.has(token)) tokenMatches += 1;
  });

  score += tokenMatches;

  return score;
}

export function isKeywordRelevantToBusiness(
  keyword: string,
  context: BusinessContext,
  minimumScore = 4
) {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;

  const hasMultiwordCorePhrase = context.coreTokens.some((phrase) => {
    const normalizedPhrase = normalizeText(phrase);
    return normalizedPhrase.includes(" ") && normalizedKeyword.includes(normalizedPhrase);
  });

  const hasCategoryPhrase = context.categoryKeywords.some((phrase) => {
    const normalizedPhrase = normalizeText(phrase);
    return normalizedPhrase.length >= 5 && normalizedKeyword.includes(normalizedPhrase);
  });

  if (hasMultiwordCorePhrase || hasCategoryPhrase) return true;

  const keywordTokens = new Set(relevanceTokens(normalizedKeyword).map(singularizeToken));
  const contextTokens = new Set(
    relevanceTokens([context.primaryService, ...context.coreTokens].join(" ")).map(singularizeToken)
  );

  let distinctMatches = 0;
  keywordTokens.forEach((token) => {
    if (contextTokens.has(token)) distinctMatches += 1;
  });

  // One broad token such as "saas", "software", "backlink", or "outreach"
  // is not enough to qualify an opportunity. Require two independent signals
  // unless a strong multi-word/category phrase matched above.
  if (distinctMatches >= 2) return true;

  return keywordRelevanceScore(keyword, context) >= Math.max(7, minimumScore);
}

function singularizeToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("sses")) return token;
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 4) return token.slice(0, -1);
  return token;
}

export function semanticKeywordKey(keyword: string) {
  const tokens = relevanceTokens(keyword)
    .map(singularizeToken)
    .filter((token) => !["near", "me"].includes(token))
    .sort();

  return Array.from(new Set(tokens)).join("|");
}

export function dedupeKeywordItems<T extends Record<string, any>>(
  items: T[],
  keywordGetter: (item: T) => string = (item) => String(item?.keyword || "")
) {
  const winners = new Map<string, T>();

  for (const item of items) {
    const keyword = keywordGetter(item);
    const key = semanticKeywordKey(keyword) || normalizeText(keyword);
    if (!key) continue;

    const previous = winners.get(key);
    if (!previous) {
      winners.set(key, item);
      continue;
    }

    const itemOpportunity = Number(item?.opportunityScore ?? item?.opportunity ?? 0);
    const prevOpportunity = Number(previous?.opportunityScore ?? previous?.opportunity ?? 0);
    const itemVolume = Number(item?.volume ?? item?.search_volume ?? 0);
    const prevVolume = Number(previous?.volume ?? previous?.search_volume ?? 0);

    if (
      itemOpportunity > prevOpportunity ||
      (itemOpportunity === prevOpportunity && itemVolume > prevVolume)
    ) {
      winners.set(key, item);
    }
  }

  return Array.from(winners.values());
}

export function filterRelevantKeywordItems<T extends Record<string, any>>(
  items: T[],
  context: BusinessContext,
  options?: {
    keywordGetter?: (item: T) => string;
    minimumScore?: number;
    dedupe?: boolean;
  }
) {
  const getter = options?.keywordGetter || ((item: T) => String(item?.keyword || ""));
  const minimumScore = options?.minimumScore ?? 4;

  const relevant = items.filter((item) =>
    isKeywordRelevantToBusiness(getter(item), context, minimumScore)
  );

  return options?.dedupe === false ? relevant : dedupeKeywordItems(relevant, getter);
}

export function buildAiPreviewPrompts(context: BusinessContext, country = "United States") {
  const market = country ? ` in ${country}` : "";
  const category = context.primaryService;

  return [
    `Which companies are considered the best for ${category}${market}?`,
    `Which ${category} providers are most trusted${market}?`,
    `Recommend leading companies that specialize in ${category}${market}.`,
  ];
}
