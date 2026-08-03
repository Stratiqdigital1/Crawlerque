import {
  buildBusinessContext,
  type BusinessContext,
} from "@/lib/business-context";

export type MarketRole =
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

export type ResolvedBusinessContext = BusinessContext & {
  marketRole: MarketRole;
  localSeoApplicable: boolean;
  aiPrompts: string[];
  resolutionMethod:
    | "deterministic"
    | "descriptor-fallback"
    | "semantic-fallback";
  semanticFallbackUsed: boolean;
  searchSeed: string;
};

type ResolveBusinessContextInput = {
  html?: string;
  title?: string;
  description?: string;
  h1?: string;
  bodyText?: string;
  domain: string;
  countryName?: string;
  countryCode?: string;
  languageName?: string;
  languageCode?: string;
};

const GENERIC_WORDS = new Set([
  "home", "homepage", "official", "welcome", "website", "site",
  "online", "company", "inc", "llc", "ltd", "limited", "group",
  "global", "solutions",
]);

const DESCRIPTOR_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "by", "for", "from", "in",
  "into", "of", "on", "or", "the", "to", "with", "your", "our",
  "we", "you", "best", "top",
]);

function normalize(value: unknown) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}+#.&'_\-\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function comparable(value: unknown) {
  return normalize(value)
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function words(value: unknown) {
  return normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !DESCRIPTOR_STOP_WORDS.has(token));
}

function titleCase(value: string) {
  return String(value || "")
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .trim();
}

function uniqueStrings(values: unknown[], limit = 12) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const cleaned = String(value || "").replace(/\s+/g, " ").trim();
    const key = normalize(cleaned);
    if (!cleaned || !key || seen.has(key)) continue;
    seen.add(key);
    output.push(cleaned);
    if (output.length >= limit) break;
  }

  return output;
}

function isBrandLike(value: string, brandName: string) {
  const a = comparable(value);
  const b = comparable(brandName);
  if (!a || !b) return false;
  return a === b || (a.length >= 5 && b.includes(a)) || (b.length >= 5 && a.includes(b));
}

function meaningfulTokenCount(value: string, brandName: string) {
  const brandTokens = new Set(words(brandName));
  return words(value).filter(
    (token) => !brandTokens.has(token) && !GENERIC_WORDS.has(token)
  ).length;
}

function deriveDescriptor(input: {
  title: string;
  description: string;
  h1: string;
  brandName: string;
}) {
  const titleParts = String(input.title || "")
    .split(/[|–—•:]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const descriptionLead = String(input.description || "")
    .split(/[.!?]/)[0]
    .trim();

  const candidates = [...titleParts, input.h1, descriptionLead]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => !isBrandLike(value, input.brandName));

  const scored = candidates
    .map((value) => {
      const tokenCount = meaningfulTokenCount(value, input.brandName);
      let score = tokenCount * 3;
      if (/\b(review|reviews|comparison|comparisons|news|magazine|blog|guide|guides|advice)\b/i.test(value)) score += 6;
      if (/\b(service|services|agency|consulting|consultant|development|platform|software|store|shop|marketplace|clinic|law|restaurant)\b/i.test(value)) score += 5;
      if (value.length >= 18 && value.length <= 90) score += 2;
      return { value, score, tokenCount };
    })
    .filter((item) => item.tokenCount >= 2)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.value || "";
}

function inferMarketRole(textValue: string): MarketRole {
  const text = normalize(textValue);
  if (/\b(review|reviews|comparison|comparisons|news|magazine|publication|editorial|buying guide|buying advice)\b/.test(text)) return "publication";
  if (/\b(marketplace|directory|vendors|listings|classifieds)\b/.test(text)) return "marketplace";
  if (/\b(online store|ecommerce|e-commerce|shop|shopping|products)\b/.test(text)) return "ecommerce";
  if (/\b(saas platform|software platform|cloud platform|application|app platform)\b/.test(text)) return "software_product";
  if (/\b(platform|creator platform|community platform|subscription platform)\b/.test(text)) return "platform";
  if (/\b(clinic|doctor|dentist|dental|hospital|medical practice|healthcare provider)\b/.test(text)) return "healthcare_provider";
  if (/\b(restaurant|cafe|café|bar|bakery)\b/.test(text)) return "restaurant";
  if (/\b(law firm|attorney|lawyer|realtor|real estate|plumber|electrician|contractor|local service)\b/.test(text)) return "local_business";
  if (/\b(agency|services|consulting|consultant|development company|firm)\b/.test(text)) return "service_provider";
  return "other";
}

function normalizeDescriptorService(descriptor: string, role: MarketRole) {
  const value = String(descriptor || "").replace(/\s+/g, " ").trim();
  if (role === "publication" && /\bsaas\b/i.test(value) && /\b(review|reviews|comparison|comparisons)\b/i.test(value)) {
    return "SaaS software reviews and comparisons";
  }
  if (role === "publication" && /\bsoftware\b/i.test(value) && /\b(review|reviews|comparison|comparisons)\b/i.test(value)) {
    return "software reviews and comparisons";
  }
  return value;
}

function categoryKeyFromService(service: string, role: MarketRole) {
  const slug = normalize(service)
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return `${role}_${slug || "general"}`;
}

function contextTokens(service: string) {
  return uniqueStrings(
    words(service).filter((token) => token.length >= 3 && !GENERIC_WORDS.has(token)),
    10
  );
}

function buildRoleKeywords(service: string, role: MarketRole) {
  if (role === "publication") {
    return uniqueStrings([
      service,
      `${service} websites`,
      `${service} sites`,
      `best ${service}`,
      `trusted ${service}`,
      `independent ${service}`,
      `business software reviews`,
      `software comparison websites`,
    ]);
  }
  if (role === "ecommerce") {
    return uniqueStrings([service, `best ${service}`, `${service} online`, `${service} store`, `buy ${service}`]);
  }
  if (role === "software_product" || role === "platform" || role === "marketplace") {
    return uniqueStrings([service, `best ${service}`, `${service} platforms`, `${service} software`, `${service} alternatives`]);
  }
  return uniqueStrings([service, `${service} companies`, `${service} services`, `${service} providers`, `best ${service}`]);
}

function buildRoleSerpKeywords(service: string, role: MarketRole) {
  if (role === "publication") {
    return uniqueStrings([service, `best ${service} websites`, `${service} sites`, `business software reviews`, `software comparison websites`], 5);
  }
  if (role === "ecommerce") {
    return uniqueStrings([service, `best ${service}`, `buy ${service}`, `${service} online`], 5);
  }
  if (role === "software_product" || role === "platform" || role === "marketplace") {
    return uniqueStrings([service, `best ${service}`, `${service} alternatives`, `${service} platform`], 5);
  }
  return uniqueStrings([service, `best ${service}`, `${service} company`, `${service} services`], 5);
}

function buildRolePrompts(service: string, role: MarketRole, countryName: string) {
  const market = countryName ? ` in ${countryName}` : "";
  if (role === "publication") {
    return [
      `Which websites are most trusted for ${service}${market}?`,
      `What are the best sites for ${service}${market}?`,
      `Which publications are commonly used for ${service}${market}?`,
    ];
  }
  if (role === "ecommerce") {
    return [
      `Which online stores are considered the best for ${service}${market}?`,
      `Where do shoppers usually buy ${service}${market}?`,
      `Which ecommerce brands are most trusted for ${service}${market}?`,
    ];
  }
  if (role === "software_product" || role === "platform" || role === "marketplace") {
    return [
      `Which ${service} options are considered the best${market}?`,
      `Which ${service} providers are most trusted${market}?`,
      `What are the leading ${service} options for buyers${market}?`,
    ];
  }
  if (role === "restaurant" || role === "healthcare_provider" || role === "local_business") {
    return [
      `Which ${service} businesses are most recommended${market}?`,
      `Which ${service} providers are most trusted${market}?`,
      `What are the best-rated options for ${service}${market}?`,
    ];
  }
  return [
    `Which companies are considered the best for ${service}${market}?`,
    `Which ${service} providers are most trusted${market}?`,
    `Recommend leading companies that specialize in ${service}${market}.`,
  ];
}

function localApplicable(role: MarketRole) {
  return ["service_provider", "local_business", "healthcare_provider", "restaurant"].includes(role);
}

function roleFromCategoryKey(categoryKey: string): MarketRole | null {
  const key = String(categoryKey || "").toLowerCase();

  if (key === "ecommerce" || /grooming|retail|store|shop/.test(key)) {
    return "ecommerce";
  }

  if (key === "saas_product" || /seo_audit|software_product|saas_software/.test(key)) {
    return "software_product";
  }

  if (/creator_subscription_platform|marketplace/.test(key)) {
    return key.includes("marketplace") ? "marketplace" : "platform";
  }

  if (/real_estate|legal|restaurant|local_service/.test(key)) {
    return key.includes("restaurant") ? "restaurant" : "local_business";
  }

  if (/healthcare_provider|clinic|dental/.test(key)) {
    return "healthcare_provider";
  }

  if (/link_building|seo_agency|amazon_marketing|digital_marketing|software_development|consulting|agency/.test(key)) {
    return "service_provider";
  }

  return null;
}

function enrichDeterministicContext(context: BusinessContext, countryName: string): ResolvedBusinessContext {
  const role =
    roleFromCategoryKey(context.categoryKey) ||
    inferMarketRole([context.categoryLabel, context.primaryService, ...context.categoryKeywords].join(" "));
  return {
    ...context,
    marketRole: role,
    localSeoApplicable: localApplicable(role),
    aiPrompts: buildRolePrompts(context.primaryService, role, countryName),
    resolutionMethod: "deterministic",
    semanticFallbackUsed: false,
    searchSeed: context.primaryService,
  };
}

function looksUnsafe(context: BusinessContext) {
  if (context.categoryKey === "general_service" || context.confidence === "low") return true;
  if (isBrandLike(context.primaryService, context.brandName)) return true;
  if (meaningfulTokenCount(context.primaryService, context.brandName) < 2) return true;
  return false;
}

function buildDescriptorContext(base: BusinessContext, descriptor: string, countryName: string): ResolvedBusinessContext | null {
  if (!descriptor) return null;
  const role = inferMarketRole(descriptor);
  const service = normalizeDescriptorService(descriptor, role);
  if (!service || isBrandLike(service, base.brandName) || meaningfulTokenCount(service, base.brandName) < 2) return null;
  const categoryKeywords = buildRoleKeywords(service, role);
  return {
    ...base,
    categoryKey: categoryKeyFromService(service, role),
    categoryLabel: titleCase(service),
    primaryService: service,
    coreTokens: contextTokens(service),
    categoryKeywords,
    serpKeywords: buildRoleSerpKeywords(service, role),
    localQueryService: service,
    confidence: "medium",
    confidenceScore: Math.max(Number(base.confidenceScore || 0), 55),
    matchedSignals: uniqueStrings([...(Array.isArray(base.matchedSignals) ? base.matchedSignals : []), `descriptor:${descriptor}`]),
    source: "homepage-context",
    marketRole: role,
    localSeoApplicable: localApplicable(role),
    aiPrompts: buildRolePrompts(service, role, countryName),
    resolutionMethod: "descriptor-fallback",
    semanticFallbackUsed: false,
    searchSeed: service,
  };
}

function safeJsonObject(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, any>;
}

function cleanStringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value.map((item) => String(item || "")), limit);
}

async function semanticFallback(
  input: ResolveBusinessContextInput,
  base: BusinessContext
): Promise<ResolvedBusinessContext | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_CONTEXT_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const countryName = String(input.countryName || "").trim();
  const languageName = String(input.languageName || "English").trim();

  const evidence = {
    domain: input.domain,
    detectedBrand: base.brandName,
    title: String(input.title || "").slice(0, 240),
    metaDescription: String(input.description || "").slice(0, 420),
    h1: String(input.h1 || "").slice(0, 240),
    bodyExcerpt: String(input.bodyText || "").replace(/\s+/g, " ").slice(0, 5000),
    countryName,
    countryCode: input.countryCode || "",
    languageName,
    languageCode: input.languageCode || "",
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You classify websites for a commercial website-audit platform.",
            "Return JSON only.",
            "Infer the actual business/category from page evidence, not from the brand name.",
            "Never use the audited brand as the category, primary service, keyword seed, or AI prompt topic.",
            "Support businesses, publications, ecommerce stores, SaaS products, marketplaces, nonprofits, local businesses, healthcare, legal, education, finance, travel, restaurants, media, and unknown niches worldwide.",
            "The selected country is market context, not evidence of business type.",
            "Use the selected audit language for search keywords and AI prompts when practical.",
            "If the site is an editorial/review/publication site, classify it as a publication and make Local SEO not applicable.",
            "If evidence is weak, return a useful broad category with medium/low confidence rather than copying the brand.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Return brandName, categoryKey, categoryLabel, primaryService, marketRole, coreTokens, categoryKeywords, serpKeywords, localQueryService, localSeoApplicable, aiPrompts, confidence.",
            allowedMarketRoles: ["service_provider", "software_product", "ecommerce", "publication", "marketplace", "platform", "local_business", "healthcare_provider", "restaurant", "other"],
            rules: {
              coreTokens: "3 to 10 concise topical tokens or phrases",
              categoryKeywords: "5 to 10 non-branded category search phrases",
              serpKeywords: "3 to 5 non-branded category queries",
              aiPrompts: "exactly 3 natural brand-neutral buyer/recommendation prompts localized to the selected country where relevant",
              categoryKey: "snake_case",
            },
            evidence,
          }),
        },
      ],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) return null;
  const json = await response.json();
  const raw = json?.choices?.[0]?.message?.content;
  if (!raw) return null;

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const object = safeJsonObject(parsed);
  if (!object) return null;

  const brandName = String(object.brandName || base.brandName).trim();
  const primaryService = String(object.primaryService || "").replace(/\s+/g, " ").trim();
  if (!primaryService || isBrandLike(primaryService, brandName) || meaningfulTokenCount(primaryService, brandName) < 2) return null;

  const allowedRoles = new Set<MarketRole>([
    "service_provider", "software_product", "ecommerce", "publication",
    "marketplace", "platform", "local_business", "healthcare_provider",
    "restaurant", "other",
  ]);
  const marketRoleCandidate = String(object.marketRole || "other") as MarketRole;
  const marketRole: MarketRole = allowedRoles.has(marketRoleCandidate) ? marketRoleCandidate : "other";

  const confidenceRaw = String(object.confidence || "medium").toLowerCase();
  const confidence: "high" | "medium" | "low" = confidenceRaw === "high" ? "high" : confidenceRaw === "low" ? "low" : "medium";

  const categoryKeywords = cleanStringArray(object.categoryKeywords, 10);
  const serpKeywords = cleanStringArray(object.serpKeywords, 5);
  const aiPrompts = cleanStringArray(object.aiPrompts, 3);
  const coreTokens = cleanStringArray(object.coreTokens, 10);

  return {
    ...base,
    brandName: brandName || base.brandName,
    categoryKey: String(object.categoryKey || categoryKeyFromService(primaryService, marketRole))
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, ""),
    categoryLabel: String(object.categoryLabel || titleCase(primaryService)).trim(),
    primaryService,
    coreTokens: coreTokens.length >= 2 ? coreTokens : contextTokens(primaryService),
    categoryKeywords: categoryKeywords.length >= 3 ? categoryKeywords : buildRoleKeywords(primaryService, marketRole),
    serpKeywords: serpKeywords.length >= 3 ? serpKeywords : buildRoleSerpKeywords(primaryService, marketRole),
    localQueryService: String(object.localQueryService || primaryService).trim(),
    confidence,
    confidenceScore: confidence === "high" ? 90 : confidence === "medium" ? 70 : 45,
    matchedSignals: uniqueStrings([...(Array.isArray(base.matchedSignals) ? base.matchedSignals : []), "semantic-fallback"]),
    source: "homepage-context",
    marketRole,
    localSeoApplicable: typeof object.localSeoApplicable === "boolean" ? object.localSeoApplicable : localApplicable(marketRole),
    aiPrompts: aiPrompts.length >= 3 ? aiPrompts : buildRolePrompts(primaryService, marketRole, countryName),
    resolutionMethod: "semantic-fallback",
    semanticFallbackUsed: true,
    searchSeed: primaryService,
  };
}

export async function resolveBusinessContext(
  input: ResolveBusinessContextInput
): Promise<ResolvedBusinessContext> {
  const deterministic = buildBusinessContext({
    html: input.html,
    title: input.title,
    description: input.description,
    h1: input.h1,
    bodyText: input.bodyText,
    domain: input.domain,
  });

  const countryName = String(input.countryName || "").trim();

  if (!looksUnsafe(deterministic)) {
    return enrichDeterministicContext(deterministic, countryName);
  }

  const descriptor = deriveDescriptor({
    title: String(input.title || ""),
    description: String(input.description || ""),
    h1: String(input.h1 || ""),
    brandName: deterministic.brandName,
  });

  const descriptorContext = buildDescriptorContext(deterministic, descriptor, countryName);

  if (
    descriptorContext &&
    meaningfulTokenCount(descriptorContext.primaryService, descriptorContext.brandName) >= 3
  ) {
    return descriptorContext;
  }

  try {
    const semantic = await semanticFallback(input, deterministic);
    if (semantic) return semantic;
  } catch (error) {
    console.error("Business context semantic fallback failed:", error);
  }

  if (descriptorContext) return descriptorContext;

  return {
    ...deterministic,
    categoryKey: "other_products_and_services",
    categoryLabel: "Products and Services",
    primaryService: "products and services",
    coreTokens: ["products", "services"],
    categoryKeywords: ["products and services"],
    serpKeywords: [],
    localQueryService: "products and services",
    confidence: "low",
    confidenceScore: 20,
    matchedSignals: ["safe-generic-fallback"],
    source: "homepage-context",
    marketRole: "other",
    localSeoApplicable: false,
    aiPrompts: [],
    resolutionMethod: "descriptor-fallback",
    semanticFallbackUsed: false,
    searchSeed: "products and services",
  };
}
