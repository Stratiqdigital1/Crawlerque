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

export type BusinessMarketRole =
  | "service_provider"
  | "software_product"
  | "ecommerce"
  | "publication"
  | "marketplace"
  | "platform"
  | "local_business"
  | "healthcare_provider"
  | "restaurant"
  | "other";

export type ResolvedBusinessContext =
  BusinessContext & {
    marketRole: BusinessMarketRole;

    localSeoApplicable: boolean;

    aiPrompts: string[];

    resolutionMethod:
      | "deterministic"
      | "semantic-fallback"
      | "descriptor-fallback";

    semanticFallbackUsed: boolean;

    searchSeed: string;
  };

type ResolveBusinessContextInput =
  BuildBusinessContextInput & {
    countryName?: string;
    countryCode?: string;
    languageName?: string;
    languageCode?: string;
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

/*
 * Some country names need a definite article to read naturally
 * ("in the United States", not "in United States"). This is a
 * generic grammar rule based on the country name's own words, not a
 * hard-coded assumption about any specific audited business.
 */
function countryNeedsArticle(country: string): boolean {
  return /^(united states|united kingdom|united arab emirates|netherlands|philippines|czech republic|dominican republic|bahamas|maldives|gambia)$/i.test(
    String(country || "").trim()
  );
}

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

function resolverComparable(
  value: unknown
) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      ""
    )
    .trim();
}

function resolverIsBrandLike(
  value: string,
  brandName: string
) {
  const candidate =
    resolverComparable(value);

  const brand =
    resolverComparable(
      brandName
    );

  if (!candidate || !brand) {
    return false;
  }

  return (
    candidate === brand ||
    (
      brand.length >= 5 &&
      candidate === brand
    )
  );
}

function resolverUnique(
  values: unknown[],
  limit = 10
) {
  const seen =
    new Set<string>();

  const output:
    string[] = [];

  for (const value of values) {
    const cleaned =
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();

    const key =
      cleaned.toLowerCase();

    if (
      !cleaned ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);
    output.push(cleaned);

    if (
      output.length >= limit
    ) {
      break;
    }
  }

  return output;
}

function resolverEscapeRegex(
  value: string
) {
  return String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function resolverStripBrandFromText(
  value: unknown,
  brandName: string,
  domain: string
) {
  let output =
    String(value || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();

  if (!output) {
    return "";
  }

  const domainRoot =
    normalizeDomainRoot(domain);

  const aliases =
    resolverUnique(
      [
        brandName,
        domainRoot,

        String(
          brandName || ""
        ).replace(
          /[^\p{L}\p{N}]+/gu,
          ""
        ),

        String(
          domainRoot || ""
        ).replace(
          /[^\p{L}\p{N}]+/gu,
          ""
        ),
      ],
      8
    )
      .filter(
        (alias) =>
          resolverComparable(
            alias
          ).length >= 3
      )
      .sort(
        (a, b) =>
          b.length - a.length
      );

  for (const alias of aliases) {
    const parts =
      String(alias)
        .split(/[\s._-]+/)
        .map((part) =>
          part.trim()
        )
        .filter(Boolean);

    if (!parts.length) {
      continue;
    }

    const aliasPattern =
      parts
        .map(
          resolverEscapeRegex
        )
        .join(
          "[\\s._-]*"
        );

    output = output.replace(
      new RegExp(
        `(^|[^\\p{L}\\p{N}])${aliasPattern}(?=$|[^\\p{L}\\p{N}])`,
        "giu"
      ),
      "$1"
    );
  }

  return output
    .replace(/\s+/g, " ")
    .replace(
      /^[\s|–—:;,.\-]+|[\s|–—:;,.\-]+$/g,
      ""
    )
    .trim();
}

function resolverBrandNeutralList(
  values: unknown[],
  brandName: string,
  domain: string,
  limit = 10
) {
  return resolverUnique(
    values
      .map((value) =>
        resolverStripBrandFromText(
          value,
          brandName,
          domain
        )
      )
      .filter(Boolean)
      .filter(
        (value) =>
          !resolverIsBrandLike(
            value,
            brandName
          )
      ),
    limit
  );
}

function resolverMarketRole(
  value: string
): BusinessMarketRole {
  const text =
    String(value || "")
      .toLowerCase();

  if (
    /review|reviews|comparison|comparisons|publication|magazine|editorial|software news/.test(
      text
    )
  ) {
    return "publication";
  }

if (
  /ecommerce|e-commerce|online store|online shop|retail store|product catalog/.test(
    text
  ) ||
  (
    /products?|product line|collections?/.test(
      text
    ) &&
    !/software|saas|platform|application|app|services?|agency|consulting|development/.test(
      text
    )
  )
) {
  return "ecommerce";
}

  if (
    /marketplace|directory platform/.test(
      text
    )
  ) {
    return "marketplace";
  }

  if (
    /creator_subscription_platform|creator subscription platform|fan subscription platform/.test(
      text
    )
  ) {
    return "platform";
  }

  if (
    /saas_product|saas software|business software|software platform|cloud software/.test(
      text
    ) &&
    !/software development/.test(
      text
    )
  ) {
    return "software_product";
  }

  if (
    /restaurant|cafe|café|bakery/.test(
      text
    )
  ) {
    return "restaurant";
  }

  if (
    /real_estate|real estate|legal services|law firm|lawyer|attorney|local service|plumber|electrician/.test(
      text
    )
  ) {
    return "local_business";
  }

  if (
    /medical clinic|healthcare services|dental|dentist|doctor|medical practice/.test(
      text
    ) &&
    !/software|development/.test(
      text
    )
  ) {
    return "healthcare_provider";
  }

  if (
    /agency|services|consulting|consultant|development|link building|marketing/.test(
      text
    )
  ) {
    return "service_provider";
  }

  return "other";
}

/*
 * For an ecommerce business, "local SEO applicable" should only be
 * trusted when there is actual textual evidence of physical/local
 * discovery intent - a store locator, in-store pickup, branches,
 * showroom, or a visible address/ZIP pattern. Without that evidence,
 * a purely online ecommerce brand should not be marked as locally
 * relevant just because a semantic classification guessed true.
 * This is a generic textual-shape check, not tied to any specific
 * brand, product, or country.
 */
/*
 * Purely online retail signals (cart, checkout, shipping language)
 * used as a role-independent safety net. This looks only at the
 * shape of the homepage text - not any specific brand, product, or
 * country - so it applies the same way to any online store anywhere
 * in the world.
 */
function hasPureOnlineRetailSignal(text: string): boolean {
  const value = String(text || "").toLowerCase();
  return /add to cart|add to bag|add to basket|shopping cart|checkout|buy online|ships? (?:worldwide|internationally|to your door)|free shipping|shipping (?:on|calculated)|order online|online store/i.test(
    value
  );
}

function computeLocalSeoApplicable(
  marketRole: BusinessMarketRole,
  parsed: any,
  input: ResolveBusinessContextInput
): boolean {
  const combinedText = `${input.title || ""} ${input.description || ""} ${input.bodyText || ""}`;
  const hasPhysicalEvidence = hasPhysicalLocalIntentEvidence(combinedText);

  const roleBasedValue: boolean = [
    "publication",
    "software_product",
    "marketplace",
    "platform",
  ].includes(marketRole)
    ? false
    : marketRole === "ecommerce"
      ? hasPhysicalEvidence &&
        (typeof parsed?.localSeoApplicable === "boolean"
          ? parsed.localSeoApplicable
          : true)
      : typeof parsed?.localSeoApplicable === "boolean"
        ? parsed.localSeoApplicable
        : resolverLocalSeoApplicable(marketRole);

  if (!roleBasedValue) return false;

  /*
   * Even if the assigned role would normally allow Local SEO (e.g.
   * the classifier mislabeled a pure online store as
   * "local_business" or "other"), a site whose homepage reads as
   * purely online retail with no physical-location evidence should
   * never get Local SEO applicable=true. This is an unconditional
   * safety net independent of role classification accuracy.
   */
  if (
    hasPureOnlineRetailSignal(combinedText) &&
    !hasPhysicalEvidence
  ) {
    return false;
  }

  return roleBasedValue;
}

function hasPhysicalLocalIntentEvidence(text: string): boolean {
  const value = String(text || "").toLowerCase();
  return /store locator|find a store|visit our store|in-?store pickup|curbside pickup|our (?:stores?|branches?|locations?|showrooms?)|nearest (?:store|branch|location)|open(?:ing)? hours|\bshowroom\b|\bbranch(?:es)?\b|\bwarehouse (?:pickup|location)\b|\b\d{5}(?:-\d{4})?\b|same[- ]day delivery in|local delivery in/i.test(
    value
  );
}

function resolverLocalSeoApplicable(
  role: BusinessMarketRole
) {
  return [
    "service_provider",
    "local_business",
    "healthcare_provider",
    "restaurant",
  ].includes(role);
}

function resolverBuildPrompts(
  primaryService: string,
  role: BusinessMarketRole,
  countryName: string
) {
  const market =
    countryName
      ? ` in ${countryNeedsArticle(countryName) ? "the " : ""}${countryName}`
      : "";

  if (
    role === "publication"
  ) {
    return [
      `Which websites are most trusted for ${primaryService}${market}?`,
      `What are the best websites for ${primaryService}${market}?`,
      `Which publications are commonly used for ${primaryService}${market}?`,
    ];
  }

  if (
    role === "ecommerce"
  ) {
    return [
      `Which online stores are most trusted for ${primaryService}${market}?`,
      `Where do shoppers usually buy ${primaryService}${market}?`,
      `Which brands are considered the best for ${primaryService}${market}?`,
    ];
  }

  if (
    role ===
      "software_product" ||
    role === "platform" ||
    role === "marketplace"
  ) {
    return [
      `Which ${primaryService} options are considered the best${market}?`,
      `Which ${primaryService} platforms are most trusted${market}?`,
      `What are the leading ${primaryService} options${market}?`,
    ];
  }

  return [
    `Which companies are considered the best for ${primaryService}${market}?`,
    `Which ${primaryService} providers are most trusted${market}?`,
    `Recommend leading companies that specialize in ${primaryService}${market}.`,
  ];
}

function resolverSafeDeterministicContext(
  context: BusinessContext
) {
  if (
    context.categoryKey ===
      "general_service"
  ) {
    return false;
  }

  if (
    context.confidence === "low"
  ) {
    return false;
  }

  if (
    resolverIsBrandLike(
      context.primaryService,
      context.brandName
    )
  ) {
    return false;
  }

  return Boolean(
    String(
      context.primaryService ||
        ""
    ).trim()
  );
}

function resolverDescriptor(
  input:
    ResolveBusinessContextInput,
  brandName: string
) {
  const titleParts =
    String(
      input.title || ""
    )
      .split(/[|–—:]+/)
      .map((item) =>
        item.trim()
      )
      .filter(Boolean);

  const descriptionLead =
    String(
      input.description || ""
    )
      .split(/[.!?]/)[0]
      .trim();

  const candidates = [
    ...titleParts.slice(1),
    input.h1,
    descriptionLead,
  ]
    .map((item) =>
      String(item || "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .filter(
      (item) =>
        !resolverIsBrandLike(
          item,
          brandName
        )
    )
    .filter(
      (item) =>
        item.length >= 8 &&
        item.length <= 140
    );

  return candidates[0] || "";
}

function resolverBuildDescriptorContext(
  base: BusinessContext,
  descriptor: string,
  countryName: string
): ResolvedBusinessContext | null {
  if (!descriptor) {
    return null;
  }

  let primaryService =
    descriptor;

  const role =
    resolverMarketRole(
      descriptor
    );

  if (
    role === "publication" &&
    /\bsaas\b/i.test(
      descriptor
    ) &&
    /review|comparison/i.test(
      descriptor
    )
  ) {
    primaryService =
      "SaaS software reviews and comparisons";
  } else if (
    role === "publication" &&
    /software/i.test(
      descriptor
    ) &&
    /review|comparison/i.test(
      descriptor
    )
  ) {
    primaryService =
      "software reviews and comparisons";
  }

  if (
    resolverIsBrandLike(
      primaryService,
      base.brandName
    )
  ) {
    return null;
  }

  const categoryKeywords =
    resolverUnique([
      primaryService,

      role === "publication"
        ? `${primaryService} websites`
        : `${primaryService} services`,

      role === "publication"
        ? `best ${primaryService} websites`
        : `best ${primaryService}`,
    ]);

  const categoryKey =
    String(primaryService)
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      )
      .slice(0, 70) ||
    "other_category";

  return {
    ...base,

    categoryKey,

    categoryLabel:
      primaryService,

    primaryService,

    coreTokens:
      resolverUnique(
        primaryService
          .toLowerCase()
          .split(/\s+/)
          .filter(
            (token) =>
              token.length >= 3
          ),
        8
      ),

    categoryKeywords,

    serpKeywords:
      categoryKeywords.slice(
        0,
        4
      ),

    localQueryService:
      primaryService,

    confidence:
      "medium",

    confidenceScore:
      Math.max(
        Number(
          base.confidenceScore ||
            0
        ),
        55
      ),

    matchedSignals:
      resolverUnique([
        ...(
          Array.isArray(
            base.matchedSignals
          )
            ? base.matchedSignals
            : []
        ),

        `descriptor:${descriptor}`,
      ]),

    marketRole:
      role,

    localSeoApplicable:
      resolverLocalSeoApplicable(
        role
      ),

    aiPrompts:
      resolverBuildPrompts(
        primaryService,
        role,
        countryName
      ),

    resolutionMethod:
      "descriptor-fallback",

    semanticFallbackUsed:
      false,

    searchSeed:
      primaryService,
  };
}

async function resolverSemanticFallback(
  input:
    ResolveBusinessContextInput,
  base:
    BusinessContext
): Promise<ResolvedBusinessContext | null> {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model =
    process.env
      .OPENAI_CONTEXT_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  const response =
    await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            model,

            temperature: 0,

            messages: [
              {
                role:
                  "system",

                content:
                  [
                    "Classify websites for a website growth intelligence platform.",
                    "Return JSON only.",
                    "Infer the actual website business/category from homepage evidence.",
                    "Never use the audited brand name as the category, primaryService, keyword seed, or AI prompt topic.",
                    "Return the canonical brandName exactly as presented in the strongest page evidence.",
                    "When the page title or meta description disagrees with the H1 or domain spelling, prefer the clear editorial brand spelling from the page title and meta description.",
                    "The selected country is market context only and must not change the website's fundamental business type.",
                    "Ignore language switchers, country selector menus, and regional storefront links when inferring content - those are navigation, not evidence of the business's core identity or market. Every AI prompt you return must reference the provided countryName only and must never name any other country or region, even if the homepage evidence mentions other countries (for example in a language/country switcher).",
                    "When countryName is provided, every returned AI prompt must include that selected country.",
                    "Support any industry worldwide including services, SaaS, ecommerce, publications, marketplaces, healthcare, legal, finance, education, restaurants, travel, nonprofits and unknown niches.",
                    "If homepage title, description, H1 and body evidence are all unavailable, classify from the domain identity only when the business identity is clear; otherwise use primaryService products and services, marketRole other, and confidence low. Do not invent niche details.",
                    "For editorial, review, comparison or news websites use marketRole publication.",
                    "For software products use software_product.",
                    "For ecommerce stores use ecommerce.",
                    "If the homepage evidence shows the store sells across multiple distinct, largely unrelated product categories (for example electronics and home appliances and fashion and beauty), do not pick just one category as primaryService. Instead describe it broadly, for example 'multi-category online retailer' or 'general merchandise retailer', and make categoryKeywords and coreTokens span the distinct categories actually shown in the evidence rather than narrowing to a single one.",
                    "For businesses that depend on physical/local discovery use localSeoApplicable true. For publications, pure SaaS products, marketplaces and online platforms normally use false.",
                  ].join(" "),
              },

              {
                role:
                  "user",

                content:
                  JSON.stringify({
requiredJsonShape: {
  brandName:
    "canonical brand name from the strongest homepage evidence",

  categoryKey:
    "snake_case string",

  categoryLabel:
    "human readable category",

  primaryService:
    "non-branded category/service phrase",

                      marketRole:
                        "service_provider | software_product | ecommerce | publication | marketplace | platform | local_business | healthcare_provider | restaurant | other",

                      coreTokens:
                        [
                          "3-8 topical tokens",
                        ],

                      categoryKeywords:
                        [
                          "5-10 non-branded category keyword phrases",
                        ],

                      serpKeywords:
                        [
                          "3-5 non-branded SERP queries",
                        ],

                      localQueryService:
                        "non-branded local query topic",

                      localSeoApplicable:
                        true,

                      aiPrompts:
                        [
                          "exactly three brand-neutral recommendation/discovery prompts",
                        ],

                      confidence:
                        "high | medium | low",
                    },

                    evidence: {
                      domain:
                        input.domain,

                      detectedBrand:
                        base.brandName,

                      title:
                        String(
                          input.title ||
                            ""
                        ).slice(
                          0,
                          250
                        ),

                      metaDescription:
                        String(
                          input.description ||
                            ""
                        ).slice(
                          0,
                          500
                        ),

                      h1:
                        String(
                          input.h1 ||
                            ""
                        ).slice(
                          0,
                          250
                        ),

                      bodyExcerpt:
                        String(
                          input.bodyText ||
                            ""
                        )
                          .replace(
                            /\s+/g,
                            " "
                          )
                          .slice(
                            0,
                            6000
                          ),

                      countryName:
                        input.countryName ||
                        "",

                      countryCode:
                        input.countryCode ||
                        "",

                      languageName:
                        input.languageName ||
                        "",

                      languageCode:
                        input.languageCode ||
                        "",
                    },
                  }),
              },
            ],
          }),

        cache:
          "no-store",

        signal:
          AbortSignal.timeout(
            12000
          ),
      }
    );

  if (!response.ok) {
    return null;
  }

  const json =
    await response.json();

  let raw =
    String(
      json?.choices?.[0]
        ?.message?.content ||
        ""
    ).trim();

  if (!raw) {
    return null;
  }

  raw = raw
    .replace(
      /^```json\s*/i,
      ""
    )
    .replace(
      /^```\s*/,
      ""
    )
    .replace(
      /```\s*$/,
      ""
    )
    .trim();

  let parsed: any;

  try {
    parsed =
      JSON.parse(raw);
  } catch {
    return null;
  }

const resolvedBrandName =
  String(
    parsed?.brandName ||
      base.brandName
  )
    .replace(/\s+/g, " ")
    .trim();

const primaryService =
  resolverStripBrandFromText(
    parsed?.primaryService ||
      "",

    resolvedBrandName ||
      base.brandName,

    input.domain
  );

if (
  !primaryService ||
  resolverIsBrandLike(
    primaryService,
    resolvedBrandName ||
      base.brandName
  )
) {
  return null;
}

  const allowedRoles =
    new Set<BusinessMarketRole>(
      [
        "service_provider",
        "software_product",
        "ecommerce",
        "publication",
        "marketplace",
        "platform",
        "local_business",
        "healthcare_provider",
        "restaurant",
        "other",
      ]
    );

  const requestedRole =
    String(
      parsed?.marketRole ||
        "other"
    ) as BusinessMarketRole;

  const marketRole =
    allowedRoles.has(
      requestedRole
    )
      ? requestedRole
      : "other";

const categoryKeywords =
  resolverBrandNeutralList(
    Array.isArray(
      parsed?.categoryKeywords
    )
      ? parsed.categoryKeywords
      : [],

    resolvedBrandName ||
      base.brandName,

    input.domain,

    10
  );

const serpKeywords =
  resolverBrandNeutralList(
    Array.isArray(
      parsed?.serpKeywords
    )
      ? parsed.serpKeywords
      : [],

    resolvedBrandName ||
      base.brandName,

    input.domain,

    5
  );

const coreTokens =
  resolverBrandNeutralList(
    Array.isArray(
      parsed?.coreTokens
    )
      ? parsed.coreTokens
      : [],

    resolvedBrandName ||
      base.brandName,

    input.domain,

    10
  );

const returnedPrompts =
  resolverBrandNeutralList(
    Array.isArray(
      parsed?.aiPrompts
    )
      ? parsed.aiPrompts
      : [],

    resolvedBrandName ||
      base.brandName,

    input.domain,

    3
  );

const selectedMarket =
  String(
    input.countryName ||
      ""
  ).trim();

const selectedMarketAliases =
  resolverUnique([
    selectedMarket,

    selectedMarket ===
    "United Kingdom"
      ? "UK"
      : "",

    selectedMarket ===
    "United States"
      ? "US"
      : "",

    selectedMarket ===
    "United Arab Emirates"
      ? "UAE"
      : "",
  ]);

const genericLocalityPhrase =
  /\b(?:in your area|near you|nearby|locally|in your region|in your city|close to you|in your neighbo(?:u)?rhood|in my area)\b/i;

/*
 * A reference list of country names used only to detect when a
 * semantically generated prompt mentions a DIFFERENT country than
 * the audit's selected market (e.g. picked up from a language or
 * country switcher in the page content). Universal geography
 * reference, not a rule tied to any single market - the selected
 * country always comes from the audit's own settings.
 */
const knownCountryNames = [
  "united states","united kingdom","united arab emirates","canada","australia","germany",
  "france","italy","spain","portugal","netherlands","belgium","switzerland","austria",
  "sweden","norway","denmark","finland","ireland","poland","czech republic","hungary",
  "romania","bulgaria","greece","turkey","russia","ukraine","india","pakistan","bangladesh",
  "china","japan","south korea","north korea","indonesia","malaysia","singapore","thailand",
  "vietnam","philippines","new zealand","south africa","nigeria","egypt","kenya","morocco",
  "saudi arabia","qatar","kuwait","bahrain","oman","israel","jordan","lebanon","brazil",
  "argentina","chile","colombia","mexico","peru","venezuela","cuba","dominican republic",
  "jamaica","bahamas","panama","costa rica","iceland","luxembourg","malta","cyprus",
  "croatia","serbia","slovakia","slovenia","estonia","latvia","lithuania","gambia","maldives",
];

function stripConflictingCountryMentions(
  value: string,
  correctCountry: string
): string {
  const normalizedCorrect = String(correctCountry || "")
    .trim()
    .toLowerCase();
  let result = value;

  knownCountryNames.forEach((name) => {
    if (name === normalizedCorrect) return;
    const pattern = new RegExp(`\\b${name}\\b`, "gi");
    result = result.replace(pattern, "").trim();
  });

  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+[?.!]/, (m) => m.trim())
    .trim();
}

const localizedReturnedPrompts =
  returnedPrompts.map(
    (prompt) => {
      const rawPrompt =
        String(prompt)
          .replace(
            /[?.!]+$/,
            ""
          )
          .trim();

      const cleanPrompt = selectedMarket
        ? stripConflictingCountryMentions(rawPrompt, selectedMarket)
        : rawPrompt;

      const alreadyLocalized =
        selectedMarketAliases.some(
          (marketAlias) => {
            const escapedAlias =
              marketAlias.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              );

            return new RegExp(
              `\\b${escapedAlias}\\b`,
              "i"
            ).test(
              cleanPrompt
            );
          }
        ) ||
        genericLocalityPhrase.test(
          cleanPrompt
        );

      if (
        !selectedMarket ||
        alreadyLocalized
      ) {
        return `${cleanPrompt}?`;
      }

      return `${cleanPrompt} in ${countryNeedsArticle(selectedMarket) ? "the " : ""}${selectedMarket}?`;
    }
  );

const resolvedCategoryLabel =
  resolverStripBrandFromText(
    parsed?.categoryLabel ||
      primaryService,

    resolvedBrandName ||
      base.brandName,

    input.domain
  ) || primaryService;

const resolvedLocalQueryService =
  resolverStripBrandFromText(
    parsed?.localQueryService ||
      primaryService,

    resolvedBrandName ||
      base.brandName,

    input.domain
  ) || primaryService;

const homepageEvidenceAvailable =
  [
    input.title,
    input.description,
    input.h1,
    input.bodyText,
  ].some(
    (value) =>
      String(value || "")
        .trim().length > 0
  );

const confidenceText =
  String(
    parsed?.confidence ||
      "medium"
  ).toLowerCase();

const confidence:
  BusinessContextConfidence =
    confidenceText === "high"
      ? "high"
      : confidenceText === "low"
        ? "low"
        : "medium";

const effectiveConfidence:
  BusinessContextConfidence =
    homepageEvidenceAvailable
      ? confidence
      : "low";

  let categoryKey =
    String(
      parsed?.categoryKey ||
        primaryService
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      )
      .slice(0, 70);

  if (!categoryKey) {
    categoryKey =
      "semantic_category";
  }

return {
  ...base,

  brandName:
    resolvedBrandName ||
    base.brandName,

  categoryKey,

categoryLabel:
  resolvedCategoryLabel,

    primaryService,

    coreTokens:
      coreTokens.length
        ? coreTokens
        : resolverUnique(
            primaryService.split(
              /\s+/
            ),
            8
          ),

    categoryKeywords:
      categoryKeywords.length
        ? categoryKeywords
        : [primaryService],

    serpKeywords:
      serpKeywords.length
        ? serpKeywords
        : [primaryService],

localQueryService:
  resolvedLocalQueryService,

confidence:
  effectiveConfidence,

confidenceScore:
  effectiveConfidence === "high"
    ? 90
    : effectiveConfidence ===
        "medium"
      ? 70
      : homepageEvidenceAvailable
        ? 45
        : 30,

    matchedSignals:
      resolverUnique([
        ...(
          Array.isArray(
            base.matchedSignals
          )
            ? base.matchedSignals
            : []
        ),

        "semantic-fallback",
      ]),

    marketRole,

localSeoApplicable:
  computeLocalSeoApplicable(
    marketRole,
    parsed,
    input
  ),

aiPrompts:
  localizedReturnedPrompts
    .length === 3
    ? localizedReturnedPrompts
    : resolverBuildPrompts(
        primaryService,
        marketRole,
        String(
          input.countryName ||
            ""
        )
      ),

    resolutionMethod:
      "semantic-fallback",

    semanticFallbackUsed:
      true,

    searchSeed:
      primaryService,
  };
}

export async function resolveBusinessContext(
  input:
    ResolveBusinessContextInput
): Promise<ResolvedBusinessContext> {
  const base =
    buildBusinessContext({
      html:
        input.html,

      title:
        input.title,

      description:
        input.description,

      h1:
        input.h1,

      bodyText:
        input.bodyText,

      domain:
        input.domain,
    });

  const countryName =
    String(
      input.countryName ||
        ""
    ).trim();

  if (
    resolverSafeDeterministicContext(
      base
    )
  ) {
    const marketRole =
      resolverMarketRole(
        [
          base.categoryKey,
          base.categoryLabel,
          base.primaryService,
          ...base.categoryKeywords,
        ].join(" ")
      );

    return {
      ...base,

      marketRole,

      localSeoApplicable:
        resolverLocalSeoApplicable(
          marketRole
        ),

      aiPrompts:
        resolverBuildPrompts(
          base.primaryService,
          marketRole,
          countryName
        ),

      resolutionMethod:
        "deterministic",

      semanticFallbackUsed:
        false,

      searchSeed:
        base.primaryService,
    };
  }

  try {
    const semanticContext =
      await resolverSemanticFallback(
        input,
        base
      );

    if (
      semanticContext
    ) {
      return semanticContext;
    }
  } catch (error) {
    console.error(
      "Business context semantic fallback failed:",
      error
    );
  }

  const descriptor =
    resolverDescriptor(
      input,
      base.brandName
    );

  const descriptorContext =
    resolverBuildDescriptorContext(
      base,
      descriptor,
      countryName
    );

  if (
    descriptorContext
  ) {
    return descriptorContext;
  }

  return {
    ...base,

    categoryKey:
      "other_products_and_services",

    categoryLabel:
      "Products and Services",

    primaryService:
      "products and services",

    coreTokens: [
      "products",
      "services",
    ],

    categoryKeywords: [
      "products and services",
    ],

    serpKeywords: [],

    localQueryService:
      "products and services",

    confidence: "low",

    confidenceScore: 20,

    marketRole: "other",

    localSeoApplicable:
      false,

    aiPrompts: [],

    resolutionMethod:
      "descriptor-fallback",

    semanticFallbackUsed:
      false,

    searchSeed:
      "products and services",
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
  const market = country ? ` in ${countryNeedsArticle(country) ? "the " : ""}${country}` : "";
  const category = context.primaryService;

  return [
    `Which companies are considered the best for ${category}${market}?`,
    `Which ${category} providers are most trusted${market}?`,
    `Recommend leading companies that specialize in ${category}${market}.`,
  ];
}