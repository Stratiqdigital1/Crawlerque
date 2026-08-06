import { NextResponse } from "next/server";
import { getCTR, getCTRCommercial } from "@/lib/ctr-curve";
import {
  DEFAULT_LOCATION_CODE,
  getLocationCode,
} from "@/lib/dataforseo-config";

function normalizeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .trim();
  }
}

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) return null;

  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

async function dataForSeoPost(
  endpoint: string,
  payload: any[]
) {
  const auth = getAuthHeader();

  if (!auth) {
    throw new Error(
      "Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD"
    );
  }

  try {
    const res = await fetch(
      `https://api.dataforseo.com/v3/${endpoint}`,
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      }
    );

    const json = await res.json();

    if (!res.ok) {
      console.error(
        "DataForSEO API failed:",
        endpoint,
        json
      );

      return null;
    }

    return json;
  } catch (error) {
    console.error(
      "DataForSEO request failed:",
      endpoint,
      error
    );

    return null;
  }
}
function getKeyword(item: any) {
  return item?.keyword || item?.keyword_data?.keyword || "";
}

function getKeywordIntent(keyword: string) {
  const value = String(keyword || "").toLowerCase();

  if (/buy|price|pricing|cost|quote|hire|agency|company|companies|service|services|developer|developers|development/.test(value)) {
    return "commercial";
  }

  if (/best|top|vs|versus|review|reviews|comparison|alternative|alternatives/.test(value)) {
    return "comparison";
  }

  if (/how|what|why|guide|tips|learn|meaning|examples/.test(value)) {
    return "informational";
  }

  return "general";
}

function getRecommendedPageType(
  keyword: string,
  intent: string,
  niche = "general",
  marketRole = ""
) {
  const value =
    String(keyword || "")
      .toLowerCase();

  const role =
    String(marketRole || "")
      .trim()
      .toLowerCase();

  /*
   * Publications should receive
   * editorial recommendations,
   * never vendor feature pages.
   */
  if (role === "publication") {
    if (
      intent === "comparison" ||
      /best|top|review|reviews|comparison|compare|alternative|alternatives/.test(
        value
      )
    ) {
      return "Comparison / Review Page";
    }

    if (
      intent === "informational"
    ) {
      return "Editorial Guide";
    }

    return "Editorial Roundup / Buying Guide";
  }

  if (role === "ecommerce") {
    if (
      intent === "informational"
    ) {
      return "Buying Guide";
    }

    if (
      intent === "comparison"
    ) {
      return "Comparison / Collection Page";
    }

    return /buy|price|shop|product|deal/.test(
      value
    )
      ? "Product / Collection Page"
      : "Category Page";
  }

  if (
    role === "software_product" ||
    role === "platform"
  ) {
    if (
      intent === "informational"
    ) {
      return "Guide / Resource Page";
    }

    if (
      intent === "comparison"
    ) {
      return "Comparison / Alternatives Page";
    }

    return "Feature / Solution Page";
  }

  if (role === "marketplace") {
    if (
      intent === "informational"
    ) {
      return "Marketplace Guide";
    }

    return "Category / Listing Page";
  }

  if (
    role === "service_provider"
  ) {
    if (
      intent === "informational"
    ) {
      return "Service Guide";
    }

    if (
      intent === "comparison"
    ) {
      return "Comparison / Case Study Page";
    }

    return "Service / Solution Page";
  }

  if (
    role === "local_business" ||
    role ===
      "healthcare_provider"
  ) {
    return /near me|city|area|location/.test(
      value
    )
      ? "Service Location Page"
      : "Service Page";
  }

  if (role === "restaurant") {
    return /menu|delivery|order|near me/.test(
      value
    )
      ? "Menu / Location Page"
      : "Category Page";
  }

  /*
   * Existing niche fallback remains
   * for older requests without marketRole.
   */
  if (
    /vs|versus|comparison|alternative|alternatives/.test(
      value
    )
  ) {
    return "Comparison Page";
  }

  if (
    intent === "informational"
  ) {
    return "Blog / Guide";
  }

  if (intent === "commercial") {
    if (niche === "ecommerce") {
      return /buy|price|shop|product/.test(
        value
      )
        ? "Product / Collection Page"
        : "Category Page";
    }

    if (niche === "saas") {
      return /software|platform|app|tool|solution/.test(
        value
      )
        ? "Feature / Solution Page"
        : "Commercial Landing Page";
    }

    if (niche === "real_estate") {
      return /near me|city|area|location|property/.test(
        value
      )
        ? "Location / Property Page"
        : "Service Page";
    }

    if (
      [
        "local_service",
        "legal",
        "healthcare",
        "healthcare_technology",
      ].includes(niche)
    ) {
      return /near me|city|area|location/.test(
        value
      )
        ? "Service Location Page"
        : "Service / Solution Page";
    }

    if (
      niche ===
      "software_development"
    ) {
      return "Service / Solution Page";
    }

    if (
      niche ===
      "creator_platform"
    ) {
      return "Solution / Landing Page";
    }

    if (
      niche === "restaurant"
    ) {
      return /menu|delivery|order|near me/.test(
        value
      )
        ? "Menu / Location Page"
        : "Category Page";
    }

    return "Commercial Landing Page";
  }

  if (
    intent === "comparison"
  ) {
    return "Comparison Page";
  }

  return niche === "ecommerce"
    ? "Category Content"
    : "Supporting Content";
}

function getOpportunityAction(score: number, pageType: string) {
  if (score >= 80) return `Create ${pageType} immediately`;
  if (score >= 60) return `Prioritize ${pageType}`;
  if (score >= 40) return `Add to content roadmap`;
  return `Keep as secondary opportunity`;
}

function calculateKeywordOpportunityScore(k: any) {
  const volume = Number(k.volume || 0);
  const cpc = Number(k.cpc || 0);
  const difficulty = Number(k.difficulty || k.keyword_difficulty || 0);
  const competitorCount = Number(k.competitors?.length || 0);
  const intent = getKeywordIntent(k.keyword);

  const volumeScore =
    volume >= 1000 ? 30 :
    volume >= 500 ? 24 :
    volume >= 100 ? 18 :
    volume >= 50 ? 12 :
    6;

  const cpcScore =
    cpc >= 10 ? 20 :
    cpc >= 5 ? 15 :
    cpc >= 2 ? 10 :
    cpc > 0 ? 5 :
    2;

  const competitorScore =
    competitorCount >= 4 ? 20 :
    competitorCount >= 3 ? 15 :
    competitorCount >= 2 ? 10 :
    4;

  const intentScore =
    intent === "commercial" ? 20 :
    intent === "comparison" ? 18 :
    intent === "informational" ? 10 :
    5;

  const difficultyPenalty =
    difficulty >= 80 ? 18 :
    difficulty >= 60 ? 12 :
    difficulty >= 40 ? 6 :
    0;

  return Math.max(
    1,
    Math.min(
      100,
      volumeScore + cpcScore + competitorScore + intentScore - difficultyPenalty
    )
  );
}

export async function GET() {
  return runDataForSEO({
  url: "https://losangelesmultifamilyrealtor.com",
  locationName: "United States",
  languageName: "English",
  locationCode: getLocationCode(
    "losangelesmultifamilyrealtor.com"
  ),
  languageCode: "en",
  device: "mobile",
  searchEngine: "google",
});
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const requestUrl = body?.url || body?.domain;
const requestDomain = normalizeDomain(requestUrl);

return runDataForSEO({
  url: requestUrl,
  locationName:
    body?.locationName || "United States",
  languageName:
    body?.languageName || "English",
  locationCode:
    Number(body?.locationCode || 0) ||
    getLocationCode(requestDomain),
  languageCode:
    String(body?.languageCode || "en"),
  device:
    body?.device === "desktop"
      ? "desktop"
      : "mobile",
  searchEngine:
    String(body?.searchEngine || "google")
      .toLowerCase(),
businessSeed:
  String(
    body?.businessSeed || ""
  ),

businessContext:
  body?.businessContext &&
  typeof body.businessContext ===
    "object"
    ? body.businessContext
    : null,

siteContext:
  body?.siteContext &&
  typeof body.siteContext ===
    "object"
    ? body.siteContext
    : null,
});
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "DataForSEO POST failed",
      },
      { status: 500 }
    );
  }
}

async function runDataForSEO({
  url,
  locationName,
  languageName,
  locationCode,
  languageCode,
  device,
  searchEngine,
  businessSeed = "",
  businessContext = null,
  siteContext = null,
}: {
  url: string;
  locationName: string;
  languageName: string;
  locationCode?: number;
  languageCode: string;
  device: "mobile" | "desktop";
  searchEngine: string;
  businessSeed?: string;

  businessContext?:
    | Record<string, any>
    | null;

  siteContext?: {
    title?: string;
    description?: string;
    h1?: string;
  } | null;
}) {
  try {
    const domain = normalizeDomain(url);

    if (searchEngine !== "google") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Complete keyword, traffic, and competitor intelligence currently supports Google only.",
        },
        { status: 400 }
      );
    }

const effectiveLocationCode =
  Number(locationCode || 0) ||
  getLocationCode(domain) ||
  DEFAULT_LOCATION_CODE;

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 }
      );
    }
const KEYWORD_FETCH_LIMIT = 1000;
const MAX_KEYWORDS = 3000;
const MAX_KEYWORD_FETCH_ITERATIONS = 3;
    const baseTask = [
  {
    target: domain,
    location_code: effectiveLocationCode,
language_code: languageCode || "en",
    include_clickstream_data: true,
  },
];

const keywordTask = [
  {
    target: domain,
    location_code: effectiveLocationCode,
language_code: languageCode || "en",
    include_clickstream_data: true,
    limit: 100,
  },
];

    const backlinkTask = [
      {
        target: domain,
        limit: 100,
      },
    ];

    const [
  rankOverviewRes,
  competitorsRes,
  keywordsRes,
  backlinksSummaryRes,
  backlinksRes,
] = await Promise.allSettled([
  dataForSeoPost("dataforseo_labs/google/domain_rank_overview/live", baseTask),
  dataForSeoPost("dataforseo_labs/google/competitors_domain/live", baseTask),
  dataForSeoPost("dataforseo_labs/google/keywords_for_site/live", keywordTask),
  dataForSeoPost("backlinks/summary/live", backlinkTask),
  dataForSeoPost("backlinks/backlinks/live", backlinkTask),
]);

    const rankOverview =
      rankOverviewRes.status === "fulfilled" ? rankOverviewRes.value : null;
    const competitors =
      competitorsRes.status === "fulfilled" ? competitorsRes.value : null;
    const keywords =
      keywordsRes.status === "fulfilled" ? keywordsRes.value : null;
    let allRankedKeywordItems: any[] = [];

let keywordOffset = 0;

let totalRankedKeywordsAvailable = MAX_KEYWORDS;

let keywordFetchIterations = 0;

let keywordFetchStoppedReason = "completed";

while (
  allRankedKeywordItems.length < MAX_KEYWORDS &&
  keywordOffset < totalRankedKeywordsAvailable &&
  keywordFetchIterations <
    MAX_KEYWORD_FETCH_ITERATIONS
) {
  keywordFetchIterations++;
  const rankedKeywordsJson = await dataForSeoPost(
    "dataforseo_labs/google/ranked_keywords/live",
    [
      {
        target: domain,
        location_code: effectiveLocationCode,
        language_code: languageCode || "en",
        include_clickstream_data: true,
        limit: KEYWORD_FETCH_LIMIT,
        offset: keywordOffset,
      },
    ]
  );

  const rankedResult =
    rankedKeywordsJson?.tasks?.[0]?.result?.[0];

  if (!rankedResult) {
  keywordFetchStoppedReason = "no-result";
  break;
}

  totalRankedKeywordsAvailable =
    Number(rankedResult.total_count ?? MAX_KEYWORDS);

  const batch = rankedResult.items || [];

  if (batch.length === 0) {
  keywordFetchStoppedReason = "empty-batch";
  break;
}

  allRankedKeywordItems = [
    ...allRankedKeywordItems,
    ...batch,
  ];

  keywordOffset += batch.length;

  console.log(
    `DataForSEO ranked keywords fetched: ${allRankedKeywordItems.length}/${totalRankedKeywordsAvailable}`
  );
}
    const backlinksSummary =
      backlinksSummaryRes.status === "fulfilled" ? backlinksSummaryRes.value : null;
    const backlinks =
      backlinksRes.status === "fulfilled" ? backlinksRes.value : null;

    const rankItem =
      rankOverview?.tasks?.[0]?.result?.[0]?.items?.[0] ||
      rankOverview?.tasks?.[0]?.result?.[0] ||
      null;
if (
  allRankedKeywordItems.length >= MAX_KEYWORDS
) {
  keywordFetchStoppedReason = "max-keywords";
}
    const rankedKeywordItems = allRankedKeywordItems;

const siteKeywordItems =
  keywords?.tasks?.[0]?.result?.[0]?.items || [];

const keywordItems =
  rankedKeywordItems.length > 0 ? rankedKeywordItems : siteKeywordItems;

    const competitorItems =
  competitors?.tasks?.[0]?.result?.[0]?.items?.length > 0
    ? competitors.tasks[0].result[0].items
    : [];

    const backlinkSummaryItem =
      backlinksSummary?.tasks?.[0]?.result?.[0] ||
      backlinksSummary?.tasks?.[0]?.result?.[0]?.items?.[0] ||
      null;

    const backlinkItems =
  backlinks?.tasks?.[0]?.result?.[0]?.items?.length > 0
    ? backlinks.tasks[0].result[0].items
    : [];

const domainLevelOrganicTrafficRaw =
  rankItem?.metrics?.organic?.clickstream_etv ??
  rankItem?.metrics?.organic?.etv ??
  rankItem?.metrics?.organic?.traffic ??
  rankItem?.organic_clickstream_etv ??
  rankItem?.organic_etv ??
  rankItem?.organic_traffic ??
  rankItem?.clickstream_etv ??
  rankItem?.etv ??
  rankItem?.traffic ??
  0;

const organicKeywords =
  rankItem?.metrics?.organic?.count ||
  rankItem?.metrics?.organic?.keywords_count ||
  rankItem?.organic_count ||
  rankItem?.organic_keywords ||
  rankItem?.keywords_count ||
  0;

const rootBrand = domain
  .replace(/^www\./, "")
  .split(".")[0]
  .toLowerCase();

function isBrandedKeyword(keyword: string) {
  const lower = String(keyword || "").toLowerCase();

  const brandVariations = [
    rootBrand,
    rootBrand.replace(/-/g, ""),
    rootBrand.replace(/-/g, " "),
    rootBrand.replace(/\s+/g, ""),
  ].filter(Boolean);

  return brandVariations.some((brand) => lower.includes(brand));
}

    const topKeywords = keywordItems.map((item: any) => {
  const keyword =
    getKeyword(item) || "-";

  const volume =
    item?.keyword_info?.search_volume ||
    item?.keyword_data?.keyword_info?.search_volume ||
    0;

  const cpc =
    item?.keyword_info?.cpc ||
    item?.keyword_data?.keyword_info?.cpc ||
    0;

  const competition =
    item?.keyword_info?.competition ||
    item?.keyword_data?.keyword_info?.competition ||
    0;

  const difficulty =
    item?.keyword_properties?.keyword_difficulty ||
    item?.keyword_info?.keyword_difficulty ||
    item?.keyword_data?.keyword_properties?.keyword_difficulty ||
    null;

  const intent =
    item?.keyword_intent ||
    item?.search_intent ||
    item?.keyword_properties?.search_intent ||
    "unknown";

  const position =
    item?.ranked_serp_element?.serp_item?.rank_group ||
    item?.serp_item?.rank_group ||
    item?.position ||
    null;

 const keywordTraffic =
  item?.ranked_serp_element?.serp_item?.clickstream_etv ??
  item?.ranked_serp_element?.serp_item?.etv ??
  item?.ranked_serp_element?.serp_item?.traffic ??
  item?.clickstream_etv ??
  item?.etv ??
  item?.traffic ??
  0;
const safePosition = Number(position || 999);

const rawTraffic = Number(keywordTraffic || 0);

const estimatedCtr =
  safePosition === 1
    ? 0.32
    : safePosition === 2
    ? 0.17
    : safePosition === 3
    ? 0.11
    : safePosition <= 5
    ? 0.08
    : safePosition <= 10
    ? 0.04
    : safePosition <= 20
    ? 0.002
    : 0;

const ctrEstimatedTraffic = Number(volume || 0) * estimatedCtr;

const adjustedTraffic =
  rawTraffic > 0 ? rawTraffic : ctrEstimatedTraffic;

const url =
  item?.ranked_serp_element?.serp_item?.url ||
  item?.serp_item?.url ||
  null;

const opportunity =
  Math.round(
    Number(volume || 0) *
      (1 - Number(competition || 0)) *
      (position && position > 10 ? 1.5 : 1)
  );
const branded = isBrandedKeyword(keyword);

return {
  keyword,
  branded,
  volume,
  traffic: Math.round(Number(adjustedTraffic || 0)),
trafficType: rawTraffic > 0 ? "dataforseo_keyword_etv" : "ctr_estimate",
  clickstream_etv: rawTraffic,
  cpc,
  competition,
  position,
  url,
  intent,
  difficulty,
  opportunity,
};
});

const getKeywordCTRVisits = (k: any) => {
  const clickstream = Number(k.clickstream_etv || 0);
  if (clickstream > 0) return Math.round(clickstream);
  const position = Number(k.position || k.rank_group || 0);
  const searchVolume = Number(k.volume || k.search_volume || 0);
  return Math.round(searchVolume * getCTR(position));
};

// SINGLE SOURCE OF TRUTH — Traffic Intelligence.
// Use keyword-level clickstream ETV when returned; otherwise fall back to
// search volume × CTR(position). Domain Analytics is never blended into this.
const trafficEligibleKeywords = topKeywords.filter((k: any) => {
  const searchVolume = Number(k.volume || k.search_volume || 0);
  return searchVolume >= 10;
});

const filteredKeywordCount =
  topKeywords.length - trafficEligibleKeywords.length;

const trafficConfidence =
  topKeywords.length < 50
    ? "insufficient-data"
    : topKeywords.length <= 500
      ? "low"
      : topKeywords.length <= 2000
        ? "moderate"
        : "high";

const organicTraffic: number | null =
  trafficConfidence === "insufficient-data"
    ? null
    : trafficEligibleKeywords.reduce(
        (sum: number, keyword: any) => {
          return (
            sum +
            getKeywordCTRVisits(keyword)
          );
        },
        0
      );

const organicTrafficRaw = organicTraffic;

const trafficDebug = trafficEligibleKeywords
  .map((k: any) => {
    const position = Number(k.position || k.rank_group || 0);
    const searchVolume = Number(k.volume || k.search_volume || 0);
    const clickstream = Number(k.clickstream_etv || 0);
    const intent = getKeywordIntent(String(k.keyword || ""));
    const isCommercial = intent === "commercial" || intent === "comparison";
    const ctr = isCommercial ? getCTRCommercial(position) : getCTR(position);
    const estimatedVisits = getKeywordCTRVisits(k);

    return {
      keyword: k.keyword,
      position,
      searchVolume,
      clickstream,
      ctr,
      estimatedVisits,
      intent,
      ctrCurve: isCommercial ? "commercial" : "standard",
      method: clickstream > 0 ? "clickstream_etv" : "ctr_curve",
    };
  })
  .sort((a: any, b: any) => b.estimatedVisits - a.estimatedVisits)
  .slice(0, 15);

  console.log("TRAFFIC DEBUG", {
  domain,
  totalKeywordsFetched: topKeywords.length,
  trafficEligibleCount: trafficEligibleKeywords.length,
  organicTraffic,
  topKeyword: trafficDebug[0],
});

const visibleTopKeywords = topKeywords.slice(0, 20);
const nonBrandedTraffic = topKeywords
  .filter((k: any) => !k.branded)
  .reduce(
    (sum: number, k: any) => sum + getKeywordCTRVisits(k),
    0
  );

const brandedTraffic = topKeywords
  .filter((k: any) => k.branded)
  .reduce(
    (sum: number, k: any) => sum + getKeywordCTRVisits(k),
    0
  );

const detectedNiche = detectNiche(
  domain,
  topKeywords,
  businessSeed,
  siteContext
);

const marketRole =
  String(
    businessContext
      ?.marketRole || ""
  )
    .trim()
    .toLowerCase();


function detectNiche(
  domain: string,
  keywords: any[],
  businessSeedValue = "",
  context:
    | {
        title?: string;
        description?: string;
        h1?: string;
      }
    | null = null
) {
  const seedText = String(
    businessSeedValue || ""
  ).toLowerCase();

  if (
    /healthcare software|healthcare technology|healthtech|medical device|samd|digital health/.test(
      seedText
    )
  ) {
    return "healthcare_technology";
  }

  if (
    /creator subscription|creator monetization|creator monetisation|fan subscription/.test(
      seedText
    )
  ) {
    return "creator_platform";
  }

  if (
    /custom software development|software development services|application development/.test(
      seedText
    )
  ) {
    return "software_development";
  }

  const siteText = [
    domain,
    context?.title,
    context?.description,
    context?.h1,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const keywordText = keywords
    .slice(0, 100)
    .map((k: any) => k?.keyword)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const categories: Array<{
    niche: string;
    terms: string[];
  }> = [
    {
      niche: "healthcare_technology",
      terms: [
        "healthcare technology",
        "healthtech",
        "health tech",
        "medical device",
        "samd",
        "digital health",
        "healthcare software",
        "medical software",
        "healthcare app",
        "clinical software",
        "life sciences",
        "telehealth",
        "ehr",
        "emr",
      ],
    },
    {
      niche: "creator_platform",
      terms: [
        "creator subscription",
        "creator monetization",
        "creator monetisation",
        "fan subscription",
        "exclusive content",
        "paid creator content",
        "fan club",
      ],
    },
    {
      niche: "real_estate",
      terms: [
        "real estate",
        "multifamily",
        "apartment",
        "property management",
        "realtor",
        "brokerage",
        "commercial real estate",
      ],
    },
    {
      niche: "legal",
      terms: [
        "law firm",
        "attorney",
        "lawyer",
        "legal services",
        "personal injury",
      ],
    },
    {
      niche: "restaurant",
      terms: [
        "restaurant",
        "menu",
        "cafe",
        "food delivery",
        "pizza",
        "burger",
      ],
    },
    {
      niche: "ecommerce",
      terms: [
        "online store",
        "ecommerce",
        "e-commerce",
        "shopping cart",
        "checkout",
        "shop online",
        "product collection",
      ],
    },
    {
      niche: "software_development",
      terms: [
        "software development company",
        "software development services",
        "custom software",
        "application development",
        "app development company",
        "digital product development",
      ],
    },
    {
      niche: "saas",
      terms: [
        "saas",
        "crm software",
        "business software",
        "software platform",
        "cloud software",
        "automation software",
      ],
    },
    {
      niche: "healthcare",
      terms: [
        "medical clinic",
        "doctor",
        "dental",
        "dentist",
        "therapy clinic",
        "hospital",
        "patient care",
      ],
    },
    {
      niche: "local_service",
      terms: [
        "digital marketing agency",
        "seo agency",
        "consulting services",
        "repair service",
        "plumber",
        "roofing",
        "hvac",
      ],
    },
  ];

  const scored = categories
    .map((category) => {
      const siteMatches =
        category.terms.reduce(
          (total, term) =>
            total +
            (siteText.includes(term)
              ? 4
              : 0),
          0
        );

      const keywordMatches =
        category.terms.reduce(
          (total, term) =>
            total +
            (keywordText.includes(term)
              ? 1
              : 0),
          0
        );

      return {
        niche: category.niche,
        score:
          siteMatches +
          keywordMatches,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score
    );

  return scored[0]?.score > 0
    ? scored[0].niche
    : "general";
}

function getAllowedCompetitorHints(niche: string) {
  const common = [
    "service",
    "services",
    "company",
    "agency",
    "group",
    "solutions",
    "consulting",
  ];

  const map: Record<string, string[]> = {
    ecommerce: [
      "shop",
      "store",
      "brand",
      "watch",
      "watches",
      "wearable",
      "earbuds",
      "audio",
      "tech",
      "electronics",
    ],

    real_estate: [
      "realtor",
      "realestate",
      "real-estate",
      "broker",
      "property",
      "apartment",
      "commercial",
      "multifamily",
      "homes",
      "realty",
    ],

    saas: [
  "software",
  "saas",
  "crm",
  "platform",
  "cloud",
  "app",
  "tool",
  "automation",
  "accounting",
  "payroll",
  "invoice",
  "bookkeeping",
  "analytics",
  "helpdesk",
  "project",
],

    legal: ["law", "legal", "attorney", "lawyer", "firm"],

    healthcare: [
      "clinic",
      "doctor",
      "medical",
      "health",
      "dental",
      "care",
    ],

    healthcare_technology: [
      "health",
      "healthcare",
      "healthtech",
      "medtech",
      "medical",
      "clinical",
      "digital",
      "software",
      "technology",
      "device",
      "ai",
      "life",
      "science",
    ],

    software_development: [
      "software",
      "development",
      "digital",
      "technology",
      "tech",
      "app",
      "application",
      "solutions",
      "agency",
    ],

    creator_platform: [
      "creator",
      "subscription",
      "content",
      "fan",
      "monetization",
      "monetisation",
      "platform",
    ],

    restaurant: [
      "restaurant",
      "cafe",
      "food",
      "menu",
      "pizza",
      "burger",
      "kitchen",
    ],

    local_service: [
      "service",
      "repair",
      "plumber",
      "roofing",
      "hvac",
      "marketing",
      "agency",
      "seo",
      "ads",
    ],

    general: common,
  };

  return [...common, ...(map[niche] || [])];
}

function getNicheKeywordHints(
  niche: string
) {
  const map: Record<string, string[]> = {
    ecommerce: [
      "shop",
      "store",
      "product",
      "shopping",
      "retail",
      "ecommerce",
    ],
    real_estate: [
      "real estate",
      "property",
      "realtor",
      "broker",
      "multifamily",
      "apartment",
      "commercial",
      "realty",
    ],
    saas: [
      "software",
      "saas",
      "crm",
      "platform",
      "cloud",
      "automation",
      "analytics",
      "helpdesk",
      "payroll",
      "accounting",
    ],
    software_development: [
      "software development",
      "application development",
      "app development",
      "web development",
      "custom software",
      "digital product",
      "developer",
      "development company",
    ],
    healthcare: [
      "healthcare",
      "medical",
      "clinic",
      "doctor",
      "dental",
      "hospital",
      "patient",
      "care",
    ],
    healthcare_technology: [
      "healthcare",
      "medical",
      "healthtech",
      "health tech",
      "medtech",
      "digital health",
      "clinical",
      "samd",
      "medical device",
      "healthcare software",
      "ehr",
      "emr",
      "telehealth",
      "life science",
      "patient",
      "fhir",
      "hipaa",
    ],
    legal: [
      "legal",
      "law",
      "lawyer",
      "attorney",
    ],
    restaurant: [
      "restaurant",
      "food",
      "menu",
      "cafe",
      "delivery",
    ],
    creator_platform: [
      "creator",
      "subscription",
      "exclusive content",
      "fan",
      "monetization",
      "monetisation",
      "paid content",
    ],
    local_service: [
      "marketing",
      "seo",
      "repair",
      "plumber",
      "roofing",
      "hvac",
      "consulting",
    ],
    general: [],
  };

  return map[niche] || [];
}

function getKnownCompetitorBrandTokens(
  niche: string
) {
  const map: Record<string, string[]> = {
    healthcare_technology: [
      "epic",
      "cerner",
      "allscripts",
      "ecw",
      "eclinicalworks",
      "athenahealth",
      "meditech",
      "nextgen",
      "veradigm",
      "oracle health",
      "oraclehealth",
    ],
    healthcare: [
      "epic",
      "cerner",
      "allscripts",
      "ecw",
      "eclinicalworks",
      "athenahealth",
      "meditech",
      "nextgen",
      "veradigm",
    ],
    creator_platform: [
      "patreon",
      "onlyfans",
      "substack",
      "ko fi",
      "kofi",
    ],
  };

  return map[niche] || [];
}

type CompetitorRelationship =
  | "direct"
  | "category_competitor"
  | "search_intermediary"
  | "marketplace"
  | "publisher_review"
  | "manufacturer_brand"
  | "social_community"
  | "unclassified_overlap";

/*
 * These words describe a business model or
 * generic website operation. They do not prove
 * that two websites sell the same thing.
 */
const competitorStopWords = new Set([
  "about",
  "add",
  "best",
  "business",
  "businesses",
  "buy",
  "cart",
  "checkout",
  "company",
  "companies",
  "delivery",
  "ecommerce",
  "global",
  "group",
  "home",
  "homepage",
  "market",
  "online",
  "platform",
  "platforms",
  "product",
  "products",
  "provider",
  "providers",
  "retail",
  "service",
  "services",
  "shop",
  "shopping",
  "site",
  "solution",
  "solutions",
  "store",
  "stores",
  "website",
  "websites",
  "world",
  "your",
  "with",
  "from",
  "this",
  "that",
  "their",
  "the",
  "and",
  "for",
  "top",
  "new",
  "get",
  "use",
  "our",
  "you",
  "all",
  "any",
  "now",
  "has",
  "are",
  "not",
  "can",
  "how",
  "why",
  "who",
  "one",
  "big",
]);

function normalizeCompetitorToken(
  value: unknown
) {
  let token = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

  if (
    token.length < 3 ||
    competitorStopWords.has(token)
  ) {
    return "";
  }

  /*
   * Lightweight singular normalization.
   * This is category-independent and improves
   * matching such as groceries/grocery,
   * cosmetics/cosmetic and services/service.
   */
  if (
    token.endsWith("ies") &&
    token.length > 5
  ) {
    token =
      `${token.slice(0, -3)}y`;
  } else if (
    token.endsWith("s") &&
    token.length > 4 &&
    !token.endsWith("ss")
  ) {
    token =
      token.slice(0, -1);
  }

  if (
    token.length < 3 ||
    competitorStopWords.has(token)
  ) {
    return "";
  }

  return token;
}

const competitorTokens = (
  value: unknown
): string[] =>
  Array.from(
    new Set(
      String(value || "")
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          " "
        )
        .split(/\s+/)
        .map(
          normalizeCompetitorToken
        )
        .filter(Boolean)
    )
  );

function buildCompetitorTopicProfile(
  primaryValues: unknown[],
  supportingValues: unknown[] = []
) {
  const tokenScores =
    new Map<string, number>();

  primaryValues.forEach(
    (value) => {
      competitorTokens(value).forEach(
        (token) => {
          tokenScores.set(
            token,
            (
              tokenScores.get(
                token
              ) || 0
            ) + 4
          );
        }
      );
    }
  );

  supportingValues.forEach(
    (value) => {
      competitorTokens(value).forEach(
        (token) => {
          tokenScores.set(
            token,
            (
              tokenScores.get(
                token
              ) || 0
            ) + 1
          );
        }
      );
    }
  );

  return Array.from(
    tokenScores.entries()
  )
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
    .slice(0, 24)
    .map(([token]) => token);
}

function knownCompetitorRelationship(
  domainValue: string
): CompetitorRelationship | null {
  const value =
    normalizeDomain(
      domainValue
    ).toLowerCase();

  if (
    /(^|\.)(yelp|yellowpages|mapquest|bbb|manta|chamberofcommerce|foursquare|superpages|hotfrog)\./.test(
      value
    )
  ) {
    return "search_intermediary";
  }

  if (
    /(^|\.)(amazon|ebay|alibaba|aliexpress|walmart|etsy|temu|wayfair|target|daraz|olx)\./.test(
      value
    )
  ) {
    return "marketplace";
  }

  if (
    /(^|\.)(youtube|facebook|instagram|linkedin|twitter|x|pinterest|reddit|tiktok|quora|wikipedia)\./.test(
      value
    )
  ) {
    return "social_community";
  }

  if (
    /(^|\.)(g2|capterra|getapp|softwareadvice|trustradius|pcmag|techradar|cnet|forbes|nerdwallet|healthline)\./.test(
      value
    )
  ) {
    return "publisher_review";
  }

  return null;
}

function competitorRelationshipLabel(
  relationship:
    CompetitorRelationship
) {
const labels:
  Record<
    CompetitorRelationship,
    string
  > = {
  direct:
    "Direct Competitor",

  category_competitor:
    "Category / Vertical Competitor",

  search_intermediary:
    "Search Visibility Intermediary",

  marketplace:
    "Marketplace",

  publisher_review:
    "Publisher / Review Site",

  manufacturer_brand:
    "Manufacturer / Industry Brand",

  social_community:
    "Social / Community Platform",

  unclassified_overlap:
    "Unclassified Organic Overlap",
};

  return labels[
    relationship
  ];
}

function readHtmlValue(
  html: string,
  pattern: RegExp
) {
  return String(
    html.match(pattern)?.[1] ||
      ""
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getCompetitorHomepageText(
  domainValue: string
) {
  const domain =
    normalizeDomain(
      domainValue
    );

  if (
    !/^[a-z0-9.-]+$/i.test(
      domain
    ) ||
    domain === "localhost" ||
    domain.endsWith(
      ".local"
    ) ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(
      domain
    )
  ) {
    return {
      text: "",
      title: "",
      description: "",
      fetched: false,
    };
  }

  const browserLikeHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const attemptFetch = async (headers: Record<string, string>) => {
    const response = await fetch(`https://${domain}`, {
      headers,
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.text()).slice(0, 300000);
  };

  try {
    let html: string;

    try {
      html = await attemptFetch(browserLikeHeaders);
    } catch (firstError) {
      // Some sites block the identifying UA above but allow a plain
      // default fetch; retry once before giving up on this domain.
      html = await attemptFetch({
        Accept: "text/html,application/xhtml+xml",
      });
    }

    const title =
      readHtmlValue(
        html,
        /<title[^>]*>([\s\S]*?)<\/title>/i
      );

    const h1 =
      readHtmlValue(
        html,
        /<h1[^>]*>([\s\S]*?)<\/h1>/i
      );

    const description =
      readHtmlValue(
        html,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
      ) ||
      readHtmlValue(
        html,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i
      );

    /*
     * A bot-protection interstitial (Cloudflare "Just a moment...",
     * a CAPTCHA gate, an "enable JavaScript" notice, etc.) can return
     * HTTP 200 with almost no real body text and a generic title.
     * Trusting that page as business evidence would wrongly read as
     * "no matching business model" instead of "evidence unavailable".
     * This check is shape-based (challenge-page phrasing + very
     * little real content), never tied to a specific competitor.
     */
    const combinedEvidenceText = `${title} ${description} ${h1}`.trim();
    const looksLikeBotChallenge =
      /just a moment|checking your browser|enable javascript|verify you are human|verifying you are human|attention required|access denied|are you a robot|please wait while we verify|ddos protection by cloudflare|one more step/i.test(
        html.slice(0, 20000)
      ) && combinedEvidenceText.length < 60;

    if (looksLikeBotChallenge) {
      return {
        text: "",
        title: "",
        description: "",
        fetched: false,
      };
    }

    return {
      title,
      description,

      text:
        combinedEvidenceText
          .toLowerCase(),

      fetched: true,
    };
  } catch (error) {
    console.warn(
      "Competitor homepage classification failed:",
      domain,
      error
    );

    return {
      text: "",
      title: "",
      description: "",
      fetched: false,
    };
  }
}

function inferCompetitorRole(
  textValue: string
) {
  const text =
    String(
      textValue || ""
    ).toLowerCase();

  if (
    /business directory|local businesses|business listings|local reviews|find businesses/.test(
      text
    )
  ) {
    return "search_intermediary";
  }

  if (
    /marketplace|buy and sell|third[- ]party sellers|millions of products|hire (?:freelancers|talent|experts)|find (?:freelancers|freelance|talent|work|a freelancer)|post a job|freelance jobs|freelance marketplace|gig economy|connect with clients|connect with freelancers/.test(
      text
    )
  ) {
    return "marketplace";
  }

  if (
    /manufacturer|manufactures|manufacturing|authorized dealers|dealer locator|find a dealer|wholesale|\boem\b/.test(
      text
    )
  ) {
    return "manufacturer_brand";
  }

  if (
    /reviews|comparisons|buying guides|editorial|news and reviews|independent reviews/.test(
      text
    )
  ) {
    return "publisher_review";
  }

  if (
    /online store|shop online|add to cart|add to bag|add to basket|shopping cart|buy online|product catalog|checkout|wishlist|in stock|out of stock|buy now|order now|free shipping|cash on delivery|rs\.?\s?\d|pkr\s?\d|₹\s?\d|\$\s?\d+(?:\.\d{2})?\b|price:|sku:|shop (?:our|now|the|all)|our (?:products|collection|range)|new arrivals|best ?sellers?|free returns|money[- ]back guarantee|\d{1,2}%\s*off|shipping (?:on|worldwide)|secure checkout/.test(
      text
    )
  ) {
    return "ecommerce";
  }

  if (
    /saas|software platform|cloud platform|workflow automation|business software/.test(
      text
    )
  ) {
    return "software_product";
  }

  if (
    /agency|consulting|professional services|service provider|development company|we provide/.test(
      text
    )
  ) {
    return "service_provider";
  }

  if (
    /locations|serving the|visit our|local service|near me/.test(
      text
    )
  ) {
    return "local_business";
  }

  return "other";
}

function compatibleCompetitorRole(
  auditedRole: string,
  candidateRole: string,
  auditedBusinessText: string
) {
  /*
   * Across every branch below, a candidate whose homepage text
   * didn't clearly match any of the fixed regex patterns is scored
   * as "other" - that reflects inconclusive evidence, not proof of a
   * different business model. Topical/keyword-overlap thresholds
   * further down still gate the final direct/category decision, so
   * always allowing "other" through only widens who is eligible to
   * be evaluated rather than who gets classified as a competitor.
   */
  if (
    auditedRole ===
    "publication"
  ) {
    return (
      candidateRole ===
        "publisher_review" ||
      candidateRole === "other"
    );
  }

  if (
    auditedRole ===
    "ecommerce"
  ) {
    return [
      "ecommerce",
      "local_business",
      "other",
    ].includes(candidateRole);
  }

  if (
    [
      "software_product",
      "platform",
    ].includes(
      auditedRole
    )
  ) {
    /*
     * A "platform" business (e.g. a freelance marketplace, gig
     * platform, dating platform) very often competes with other
     * platforms/marketplaces, not only software vendors or service
     * providers. Restricting it to software_product/service_provider
     * excluded genuine peer platforms whose homepage wording reads
     * as a marketplace rather than "software".
     */
    return [
      "software_product",
      "service_provider",
      "platform",
      "marketplace",
      "other",
    ].includes(
      candidateRole
    );
  }

  if (
    auditedRole ===
    "marketplace"
  ) {
    return [
      "marketplace",
      "platform",
      "other",
    ].includes(candidateRole);
  }

  if (
    [
      "service_provider",
      "local_business",
      "healthcare_provider",
      "restaurant",
    ].includes(
      auditedRole
    )
  ) {
    const sellsProducts =
      /shop|store|retail|equipment|supplies|products|dealer/.test(
        auditedBusinessText
      );

    return sellsProducts
      ? [
          "ecommerce",
          "local_business",
          "service_provider",
          "other",
        ].includes(
          candidateRole
        )
      : [
          "service_provider",
          "local_business",
          "other",
        ].includes(
          candidateRole
        );
  }

  return false;
}

async function classifyCompetitor(
  item: any,
  businessContext:
    | Record<string, any>
    | null,
  businessSeed: string,
  detectedNiche: string,
  siteContext:
    | {
        title?: string;
        description?: string;
        h1?: string;
      }
    | null,
  topKeywords: any[]
) {
  const domain =
    normalizeDomain(
      item?.domain || ""
    );

  const auditedRole =
    String(
      businessContext
        ?.marketRole || ""
    )
      .trim()
      .toLowerCase();

  const known =
    knownCompetitorRelationship(
      domain
    );

  /*
   * Structural platforms are separated early,
   * except when the audited website has the
   * same model. A marketplace may compete with
   * another marketplace, and a publication may
   * compete with another publication, but they
   * still need topical validation.
   */
  const evaluateKnownAsPeer =
    (
      auditedRole ===
        "publication" &&
      known ===
        "publisher_review"
    ) ||
    (
      auditedRole ===
        "marketplace" &&
      known ===
        "marketplace"
    );

  if (
    known &&
    !evaluateKnownAsPeer
  ) {
    return {
      ...item,

      relationship:
        known,

      relationshipLabel:
        competitorRelationshipLabel(
          known
        ),

      classificationConfidence:
        "high",

      classificationReason:
        "Recognized global platform type.",
    };
  }

  const homepage =
    await getCompetitorHomepageText(
      domain
    );

  const candidateRole =
    known ===
      "publisher_review"
      ? "publisher_review"
      : known ===
          "marketplace"
        ? "marketplace"
        : inferCompetitorRole(
            homepage.text
          );

  const auditedPrimaryValues = [
    businessSeed,

    businessContext
      ?.primaryService,

    businessContext
      ?.categoryLabel,

    ...(
      Array.isArray(
        businessContext
          ?.coreTokens
      )
        ? businessContext
            .coreTokens
        : []
    ),

    ...(
      Array.isArray(
        businessContext
          ?.categoryKeywords
      )
        ? businessContext
            .categoryKeywords
        : []
    ),

    siteContext?.title,
    siteContext?.description,
    siteContext?.h1,
  ].filter(Boolean);

  const auditedSupportingValues =
    (
      Array.isArray(
        topKeywords
      )
        ? topKeywords
        : []
    )
      .filter(
        (item: any) =>
          item?.branded !== true
      )
      .slice(0, 40)
      .map(
        (item: any) =>
          item?.keyword
      )
      .filter(Boolean);

  const auditedTopicTokens =
    buildCompetitorTopicProfile(
      auditedPrimaryValues,
      auditedSupportingValues
    );

  const candidateTopicTokens =
    buildCompetitorTopicProfile(
      [
        homepage.title,
        homepage.description,
        homepage.text,
      ]
    );

  const candidateTokenSet =
    new Set(
      candidateTopicTokens
    );

  const topicalMatches =
    auditedTopicTokens.filter(
      (token) =>
        candidateTokenSet.has(
          token
        )
    );

  const sharedKeywords =
    Number(
      item?.sharedKeywords ||
        item?.intersections ||
        0
    );

  const auditedCoverage =
    topicalMatches.length /
    Math.max(
      1,
      Math.min(
        12,
        auditedTopicTokens.length
      )
    );

  const candidateCoverage =
    topicalMatches.length /
    Math.max(
      1,
      Math.min(
        12,
        candidateTopicTokens.length
      )
    );

  const broadAuditedCategory =
    auditedTopicTokens.length >= 8;

  /*
   * Broad retailers, publications and platforms
   * require broader category coverage. A
   * specialist matching only one product family
   * becomes a category competitor, not the main
   * direct competitor.
   */
  const minimumDirectMatches =
    broadAuditedCategory
      ? 4
      : 2;

  const minimumAuditedCoverage =
    broadAuditedCategory
      ? 0.35
      : 0.25;

  const minimumCandidateCoverage =
    broadAuditedCategory
      ? 0.2
      : 0.25;

  const auditedBusinessText =
    [
      businessSeed,
      businessContext
        ?.primaryService,
      businessContext
        ?.categoryLabel,
      siteContext?.title,
      siteContext?.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  const sameBusinessModel =
    compatibleCompetitorRole(
      auditedRole,
      candidateRole,
      auditedBusinessText
    );

  const candidateRoleIsAmbiguous =
    candidateRole === "other";

  const qualifiesAsDirect =
    sameBusinessModel &&
    homepage.fetched &&
    sharedKeywords >= 3 &&
    topicalMatches.length >=
      (
        candidateRoleIsAmbiguous
          ? minimumDirectMatches + 1
          : minimumDirectMatches
      ) &&
    auditedCoverage >=
      minimumAuditedCoverage &&
    candidateCoverage >=
      minimumCandidateCoverage;

  const qualifiesAsCategoryCompetitor =
    sameBusinessModel &&
    homepage.fetched &&
    !qualifiesAsDirect &&
    (
      candidateRoleIsAmbiguous
        ? (
            topicalMatches.length >= Math.max(2, minimumDirectMatches - 1) &&
            sharedKeywords >= 5 &&
            candidateCoverage >= minimumCandidateCoverage
          )
        : (
            (
              topicalMatches.length >= 2 &&
              sharedKeywords >= 3
            ) ||
            (
              topicalMatches.length >= 1 &&
              sharedKeywords >= 10
            )
          )
    );

  /*
   * Homepage evidence could not be gathered at all (WAF/bot
   * protection, timeout after retry, etc.). Rather than silently
   * discarding a domain with a very strong independent
   * shared-keyword signal from the search-data provider, surface it
   * as a lower-confidence category competitor that still requires
   * manual verification. This threshold is high enough that generic
   * search-visibility overlap alone should not trigger it, and it
   * never assumes a specific business model - it only reflects that
   * the provider itself found heavy organic overlap.
   */
  const qualifiesAsUnverifiedStrongOverlap =
    !homepage.fetched &&
    known === null &&
    sharedKeywords >= 8;

  let relationship:
    CompetitorRelationship =
      "unclassified_overlap";

  if (
    candidateRole ===
    "search_intermediary"
  ) {
    relationship =
      "search_intermediary";
  } else if (
    candidateRole ===
    "manufacturer_brand"
  ) {
    relationship =
      "manufacturer_brand";
  } else if (
    candidateRole ===
      "publisher_review" &&
    auditedRole !==
      "publication"
  ) {
    relationship =
      "publisher_review";
  } else if (
    candidateRole ===
      "marketplace" &&
    auditedRole !==
      "marketplace"
  ) {
    relationship =
      "marketplace";
  } else if (
    qualifiesAsDirect
  ) {
    relationship =
      "direct";
  } else if (
    qualifiesAsCategoryCompetitor
  ) {
    relationship =
      "category_competitor";
  } else if (
    qualifiesAsUnverifiedStrongOverlap
  ) {
    relationship =
      "category_competitor";
  }

  const roundedAuditedCoverage =
    Math.round(
      auditedCoverage * 100
    );

  const roundedCandidateCoverage =
    Math.round(
      candidateCoverage * 100
    );

  const topicalMatchSummary =
    topicalMatches.slice(0, 3).join(", ") || "limited overlap";

  const classificationReason =
    relationship === "direct"
      ? `Same business model; broad topical match (${topicalMatchSummary}).`
      : relationship ===
          "category_competitor" &&
        qualifiesAsCategoryCompetitor
        ? `Same business model; partial category match (${topicalMatchSummary}).`
        : relationship ===
            "category_competitor" &&
          qualifiesAsUnverifiedStrongOverlap
          ? `Homepage blocked (bot protection); ${sharedKeywords} shared keywords — verify manually.`
          : homepage.fetched
            ? "Organic overlap only; business model or topical match not confirmed."
            : "Organic overlap only; competitor homepage could not be verified.";

  return {
    ...item,

    relationship,

    relationshipLabel:
      relationship === "category_competitor" &&
      qualifiesAsUnverifiedStrongOverlap
        ? "Category / Vertical Competitor (Unverified — Homepage Blocked)"
        : competitorRelationshipLabel(
            relationship
          ),

    classificationConfidence:
      relationship === "direct"
        ? "high"
        : relationship === "category_competitor" &&
          qualifiesAsCategoryCompetitor
          ? "high"
          : relationship === "category_competitor" &&
            qualifiesAsUnverifiedStrongOverlap
            ? "low"
            : homepage.fetched
              ? "moderate"
              : "low",

    manualVerificationRecommended:
      qualifiesAsUnverifiedStrongOverlap,

    classificationReason,

    candidateRole,

    topicalMatches,

    auditedTopicTokens,

    auditedCategoryCoverage:
      roundedAuditedCoverage,

    candidateTopicCoverage:
      roundedCandidateCoverage,

    homepageTitle:
      homepage.title,

    homepageDescription:
      homepage.description,
  };
}

function getCompetitorTrafficValue(item: any): number | null {
  const rawTraffic =
    item?.metrics?.organic?.clickstream_etv ??
    item?.metrics?.organic?.etv ??
    item?.metrics?.organic?.traffic ??
    item?.clickstream_etv ??
    item?.etv ??
    item?.traffic ??
    null;

  if (
    rawTraffic === null ||
    rawTraffic === undefined ||
    rawTraffic === ""
  ) {
    return null;
  }

  const value = Number(rawTraffic);

  return Number.isFinite(value)
    ? Math.round(value)
    : null;
}

function enrichCompetitorThreat(item: any) {
  const rawTraffic = item?.traffic ?? item?.etv ?? null;
  const trafficAvailable =
    rawTraffic !== null &&
    rawTraffic !== undefined &&
    rawTraffic !== "" &&
    Number.isFinite(Number(rawTraffic));
  const traffic = trafficAvailable
    ? Number(rawTraffic)
    : null;
  const trafficForScoring = traffic ?? 0;
  const sharedKeywords = Number(item.sharedKeywords || item.intersections || 0);
  const rank = Number(item.rank || 0);
  const relevance = Number(item.relevance || 0);

const knownAuthorityBoost =
  /shopify\.com|techtarget\.com|gartner\.com|forbes\.com|hubspot\.com|salesforce\.com|microsoft\.com|oracle\.com|aws\.amazon\.com/.test(
    String(item.domain || "").toLowerCase()
  )
    ? 25
    : 0;

const authorityScore = Math.min(
  100,
  (trafficForScoring >= 50000
    ? 90
    : trafficForScoring >= 10000
    ? 78
    : trafficForScoring >= 3000
    ? 65
    : trafficForScoring >= 500
    ? 52
    : 38) + knownAuthorityBoost
);

  const overlapScore =
    sharedKeywords >= 100
      ? 30
      : sharedKeywords >= 50
      ? 24
      : sharedKeywords >= 20
      ? 18
      : sharedKeywords >= 10
      ? 12
      : 6;

  const rankScore =
    rank > 0
      ? Math.max(5, 20 - Math.min(rank, 20))
      : 8;

  const threatScore = Math.min(
    100,
    Math.round(
      authorityScore * 0.45 +
  overlapScore * 0.25 +
  relevance * 0.2 +
  rankScore * 0.1
    )
  );

  return {
    ...item,
    traffic,
    trafficAvailable,
    authorityScore,
    threatScore,
    competitiveStrength:
      threatScore >= 80
        ? "Dominant"
        : threatScore >= 60
        ? "Strong"
        : threatScore >= 40
        ? "Moderate"
        : "Weak",
    likelyWinningFactor:
      trafficForScoring >= 10000
        ? "High topical authority"
        : sharedKeywords >= 50
        ? "Strong keyword overlap"
        : sharedKeywords >= 15
        ? "Focused content coverage"
        : "Niche visibility signal",
    aiRisk:
      threatScore >= 70
        ? "High AI recommendation risk"
        : threatScore >= 50
        ? "Moderate AI visibility competition"
        : "Lower AI competition risk",
  };
}
const ignoredCompetitorDomains = [
  "google.com",
  "cloudflare.com",
];

const rawCompetitorCandidates =
  competitorItems
    .map((item: any) => {
      const competitorDomain =
        normalizeDomain(
          item?.domain ||
            item?.target ||
            ""
        );

      const sharedKeywords =
        item?.intersections ||
        item?.common_keywords ||
        item?.shared_keywords ||
        item?.metrics?.organic
          ?.count ||
        0;

      return enrichCompetitorThreat({
        domain:
          competitorDomain,

        sharedKeywords:
          Number(
            sharedKeywords || 0
          ),

        intersections:
          Number(
            sharedKeywords || 0
          ),

        traffic:
          getCompetitorTrafficValue(
            item
          ),

        rank:
          item?.rank ||
          item?.competitor_rank ||
          null,

        relevance:
          Math.min(
            100,
            Math.max(
              5,
              Number(
                sharedKeywords || 0
              ) * 10
            )
          ),
      });
    })
    .filter((item: any) => {
      const candidateDomain =
        String(
          item?.domain || ""
        ).toLowerCase();

      const sharedKeywords =
        Number(
          item?.sharedKeywords ||
            item?.intersections ||
            0
        );

      /*
       * A candidate whose domain's first label matches the audited
       * domain's own first label (e.g. brand.nl vs brand.com) is
       * almost always the same company's other-country or
       * other-TLD storefront, not a competitor. This is derived
       * purely from comparing the two domains to each other, never
       * from a fixed brand/domain list.
       */
      const auditedDomainSlug = String(domain || "")
        .toLowerCase()
        .replace(/^www\./, "")
        .split(".")[0];
      const candidateDomainSlug = candidateDomain
        .replace(/^www\./, "")
        .split(".")[0];
      const isOwnOtherCountryDomain =
        auditedDomainSlug.length >= 3 &&
        candidateDomainSlug === auditedDomainSlug;

      return (
        candidateDomain &&
        candidateDomain !==
          domain.toLowerCase() &&
        !isOwnOtherCountryDomain &&
        !ignoredCompetitorDomains.some(
          (ignoredDomain) =>
            candidateDomain ===
              ignoredDomain ||
            candidateDomain.endsWith(
              `.${ignoredDomain}`
            )
        ) &&
        sharedKeywords >= 3
      );
    })
    .sort(
      (a: any, b: any) => {
        const sharedDifference =
          Number(
            b?.sharedKeywords || 0
          ) -
          Number(
            a?.sharedKeywords || 0
          );

        if (
          sharedDifference !== 0
        ) {
          return sharedDifference;
        }

        return (
          Number(
            b?.traffic || 0
          ) -
          Number(
            a?.traffic || 0
          )
        );
      }
    )
    .slice(0, 15);

const classifiedCompetitors =
  await Promise.all(
    rawCompetitorCandidates.map(
      (item: any) =>
classifyCompetitor(
  item,
  businessContext,
  businessSeed,
  detectedNiche,
  siteContext,
  topKeywords
)
    )
  );

const sortCompetitors = (
  items: any[]
) =>
  Array.from(
    new Map<string, any>(
      items.map(
        (item: any) => [
          String(
            item?.domain || ""
          ),
          item,
        ]
      )
    ).values()
  )
    .sort(
      (a: any, b: any) => {
        const threatDifference =
          Number(
            b?.threatScore || 0
          ) -
          Number(
            a?.threatScore || 0
          );

        if (
          threatDifference !== 0
        ) {
          return threatDifference;
        }

        return (
          Number(
            b?.sharedKeywords || 0
          ) -
          Number(
            a?.sharedKeywords || 0
          )
        );
      }
    )
    .slice(0, 10);

const topCompetitors =
  sortCompetitors(
    classifiedCompetitors.filter(
      (item: any) =>
        item?.relationship ===
        "direct"
    )
  );

const competitorLandscape = {
  direct:
    topCompetitors,

  categoryCompetitors:
    sortCompetitors(
      classifiedCompetitors.filter(
        (item: any) =>
          item?.relationship ===
          "category_competitor"
      )
    ),

  searchIntermediaries:
    sortCompetitors(
      classifiedCompetitors.filter(
        (item: any) =>
          item?.relationship ===
          "search_intermediary"
      )
    ),

  marketplaces:
    sortCompetitors(
      classifiedCompetitors.filter(
        (item: any) =>
          item?.relationship ===
          "marketplace"
      )
    ),

  publishersAndReviewSites:
    sortCompetitors(
      classifiedCompetitors.filter(
        (item: any) =>
          item?.relationship ===
          "publisher_review"
      )
    ),

  manufacturersAndBrands:
    sortCompetitors(
      classifiedCompetitors.filter(
        (item: any) =>
          item?.relationship ===
          "manufacturer_brand"
      )
    ),

  socialAndCommunity:
    sortCompetitors(
      classifiedCompetitors.filter(
        (item: any) =>
          item?.relationship ===
          "social_community"
      )
    ),

  unclassifiedOverlap:
    sortCompetitors(
      classifiedCompetitors.filter(
        (item: any) =>
          item?.relationship ===
          "unclassified_overlap"
      )
    ),

  classifiedCandidates:
    classifiedCompetitors.length,

  methodology:
    "Direct competitors require compatible business-model evidence plus topical homepage overlap. Directories, marketplaces, manufacturers, publishers, social platforms, and unverified overlap are reported separately and excluded from keyword-gap generation.",
};  
    const ownKeywordSet = new Set(
      topKeywords
        .map((k: any) => String(k.keyword || "").toLowerCase().trim())
        .filter(Boolean)
    );

    const directCompetitorDomains = topCompetitors
      .map((c: any) => c.domain)
      .filter(Boolean);

    const categoryCompetitorsForGap = sortCompetitors(
      classifiedCompetitors.filter(
        (item: any) => item?.relationship === "category_competitor"
      )
    );
    const categoryCompetitorDomains = categoryCompetitorsForGap
      .map((c: any) => c.domain)
      .filter(Boolean);

    /*
     * Verified direct competitors are always prioritized. When there
     * are fewer than 3, category competitors (business model
     * unverified, but independently strong organic overlap) fill
     * the remaining API budget so a report isn't left with zero
     * keyword intelligence just because nothing cleared the direct
     * bar. Each domain's relationship type is tracked so the results
     * can be split into a safety-restricted direct gap and a clearly
     * labeled, separate category-opportunity list - the direct-only
     * rule for the main Keyword Gap KPI is not weakened.
     */
    const competitorDomains = Array.from(
      new Set<string>([
        ...directCompetitorDomains,
        ...categoryCompetitorDomains,
      ])
    ).slice(0, 3);

    const competitorDomainRelationship = new Map<string, "direct" | "category">();
    directCompetitorDomains.forEach((d: string) =>
      competitorDomainRelationship.set(d, "direct")
    );
    categoryCompetitorDomains.forEach((d: string) => {
      if (!competitorDomainRelationship.has(d)) {
        competitorDomainRelationship.set(d, "category");
      }
    });

    const competitorBrandTokens: string[] = Array.from(
      new Set<string>([
        ...competitorDomains.flatMap(
          (competitorDomain: string) => {
            const root = String(
              competitorDomain || ""
            )
              .toLowerCase()
              .replace(/^www\./, "")
              .split(".")[0]
              .replace(
                /[^a-z0-9-]/g,
                ""
              );

            return [
              root,
              root.replace(/-/g, " "),
              root.replace(/-/g, ""),
            ].filter(
              (token) =>
                token.length >= 4
            );
          }
        ),
        ...getKnownCompetitorBrandTokens(
          detectedNiche
        ),
      ])
    );

    const isCompetitorBrandedKeyword = (keyword: string) => {
      const normalizedKeyword = String(
        keyword || ""
      )
        .toLowerCase()
        .replace(
          /[^a-z0-9\s-]/g,
          " "
        )
        .replace(/\s+/g, " ")
        .trim();

      return competitorBrandTokens.some(
        (token) => {
          const normalizedToken =
            String(token || "")
              .toLowerCase()
              .replace(
                /[^a-z0-9\s-]/g,
                " "
              )
              .replace(/\s+/g, " ")
              .trim();

          if (!normalizedToken) {
            return false;
          }

          const escaped =
            normalizedToken.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );

          return new RegExp(
            `\\b${escaped}\\b`,
            "i"
          ).test(normalizedKeyword);
        }
      );
    };

    const competitorKeywordTasks = competitorDomains.map((competitorDomain: string) => ({
  target: competitorDomain,
  location_code: effectiveLocationCode,
language_code: languageCode || "en",
  include_clickstream_data: true,
  limit: 50,
}));

    const competitorKeywordResponses = await Promise.allSettled(
      competitorKeywordTasks.map((task: any) =>
  dataForSeoPost("dataforseo_labs/google/ranked_keywords/live", [task])
)
    );

    const competitorKeywordMap = new Map<
      string,
      { keyword: string; volume: number; cpc: number; competition: number; competitors: string[]; sourceTypes: Set<"direct" | "category"> }
    >();

    competitorKeywordResponses.forEach((res, index) => {
      if (res.status !== "fulfilled") return;

      const competitorDomain = competitorDomains[index];
      const items = res.value?.tasks?.[0]?.result?.[0]?.items || [];

      items.forEach((item: any) => {
        const keyword = String(getKeyword(item) || "").toLowerCase().trim();
        if (!keyword || ownKeywordSet.has(keyword)) return;

        const volume =
          item?.keyword_info?.search_volume ||
          item?.keyword_data?.keyword_info?.search_volume ||
          0;

        const cpc =
          item?.keyword_info?.cpc ||
          item?.keyword_data?.keyword_info?.cpc ||
          0;

        const competition =
          item?.keyword_info?.competition ||
          item?.keyword_data?.keyword_info?.competition ||
          0;

        const existing = competitorKeywordMap.get(keyword);
        const sourceType =
          competitorDomainRelationship.get(competitorDomain) || "category";

        if (existing) {
          if (!existing.competitors.includes(competitorDomain)) {
            existing.competitors.push(competitorDomain);
          }
          existing.sourceTypes.add(sourceType);
          existing.volume = Math.max(existing.volume, Number(volume || 0));
          existing.cpc = Math.max(existing.cpc, Number(cpc || 0));
          existing.competition = Math.max(existing.competition, Number(competition || 0));
        } else {
          competitorKeywordMap.set(keyword, {
            keyword,
            volume: Number(volume || 0),
            cpc: Number(cpc || 0),
            competition: Number(competition || 0),
            competitors: [competitorDomain],
            sourceTypes: new Set([sourceType]),
          });
        }
      });
    });

    const badKeywordPatterns = [
  /^\d+$/,
  /^\d+\s+\d+$/,
  /^about\s+/i,
  /^login$/i,
  /login/i,
  /sign in/i,
  /customer service/i,
  /support number/i,
  /coupon/i,
  /promo code/i,
  /download/i,
  /template/i,
 /\bspeed bump\b/i,
 /\bshopping speed\b/i,
 /\babout us\b/i,
 /\babout page\b/i,
 /\bhow to login\b/i,
 /\bstatus page\b/i,
 /\bfree\b/i,
  /youtube/i,
  /nokia/i,
/iphone/i,
/pro max/i,
/oneplus/i,
/1 plus/i,
/mobile price/i,
/durex/i,
/chewing gum/i,
/sale/i,
/11\.11/i,
/copilot/i,
/bluebeam/i,
/venmo/i,
/apple pay/i,
/account edge/i,
/bombbomb/i,
/365/i,
/microsoft/i,
/cloud login/i,
/service status/i,
/getapp/i,
/softwareadvice/i,
  /tiktok/i,
  /reddit/i,
  /movie/i,
  /song/i,
  /rap/i,
  /siri/i,
  /ipad/i,
  /iphone/i,
  /hawaii/i,
  /jujutsu/i,
];

const nicheKeywordHints =
  getNicheKeywordHints(
    detectedNiche
  );

const suppressedCompetitorBrandedKeywords =
  Array.from(
    competitorKeywordMap.values()
  ).filter((item: any) =>
    isCompetitorBrandedKeyword(
      String(item?.keyword || "")
    )
  ).length;

const allOpportunityKeywords = Array.from(competitorKeywordMap.values())
  .map((k: any) => {
    const intent = getKeywordIntent(k.keyword);
    const opportunityScore = calculateKeywordOpportunityScore(k);
const recommendedPageType =
  getRecommendedPageType(
    k.keyword,
    intent,
    detectedNiche,
    marketRole
  );

    return {
      ...k,
      sourceTypes: Array.from(k.sourceTypes || []),
      isDirectSourced: (k.sourceTypes || new Set()).has("direct"),
      intent,
      opportunityScore,
      recommendedPageType,
      action: getOpportunityAction(opportunityScore, recommendedPageType),
      priority:
        opportunityScore >= 75
          ? "High"
          : opportunityScore >= 55
          ? "Medium"
          : "Low",
    };
  })
  .filter((k) => {
    const keyword = String(k.keyword || "").toLowerCase().trim();

    if (keyword.length < 4) return false;

    // Standard opportunity mode excludes competitor-branded demand. Those
    // terms can be surfaced later in a separately labelled Conquest Mode.
    if (isCompetitorBrandedKeyword(keyword)) return false;

    const isBadKeyword = badKeywordPatterns.some((pattern) =>
      pattern.test(keyword)
    );

    if (isBadKeyword) return false;

    const isRelevantToNiche =
      nicheKeywordHints.length === 0
        ? true
        : nicheKeywordHints.some(
            (hint) =>
              keyword.includes(hint)
          );

    const businessCategoryTokens = Array.from(
      new Set(
        [
          ...(Array.isArray(businessContext?.coreTokens) ? businessContext.coreTokens : []),
          ...(Array.isArray(businessContext?.categoryKeywords)
            ? businessContext.categoryKeywords.flatMap((phrase: string) =>
                String(phrase || "").toLowerCase().split(/\s+/)
              )
            : []),
        ]
          .map((token: string) => String(token || "").toLowerCase().trim())
          .filter((token: string) => token.length > 3)
      )
    );

    const isRelevantToBrandCategory =
      topKeywords.some((own: any) => {
        const ownKeyword = String(own.keyword || "").toLowerCase();
        return ownKeyword
          .split(" ")
          .some((word) => word.length > 4 && keyword.includes(word));
      }) ||
      businessCategoryTokens.some((token) => keyword.includes(token));

    const hasCommercialOrTopicalIntent =
  /best|top|vs|review|reviews|comparison|company|companies|service|services|agency|software|app|platform|development|developer|developers|consulting|solution|solutions|cost|pricing|near me|guide|how|what/.test(
    keyword
  );

const competitorCoverage = Number(k.competitors?.length || 0);
const keywordVolume = Number(k.volume || 0);

const isStrongBusinessIntent =
  /company|companies|service|services|agency|software|app|platform|development|developer|developers|consulting|solution|solutions|cost|pricing|best|top|vs|review|reviews|comparison|healthcare|mobile app|web app|custom software|enterprise software|saas/.test(
    keyword
  );

return (
  isRelevantToNiche &&
  isRelevantToBrandCategory &&
  keywordVolume >= 20 &&
  competitorCoverage >= 2
);
  })
.sort((a, b) => {
  if (
    Number(b.opportunityScore || 0) !==
    Number(a.opportunityScore || 0)
  ) {
    return (
      Number(b.opportunityScore || 0) -
      Number(a.opportunityScore || 0)
    );
  }

  const scoreA =
    Number(a.volume || 0) +
    Number(a.cpc || 0) * 100 +
    Number(a.competitors?.length || 0) * 50;

  const scoreB =
    Number(b.volume || 0) +
    Number(b.cpc || 0) * 100 +
    Number(b.competitors?.length || 0) * 50;

  return scoreB - scoreA;
})
.slice(0, 24);

const missingKeywords = allOpportunityKeywords
  .filter((k: any) => k.isDirectSourced)
  .slice(0, 12);

const categoryOpportunityKeywords = allOpportunityKeywords
  .filter((k: any) => !k.isDirectSourced)
  .slice(0, 12);

    const keywordClusters: Record<string, any[]> = {};

missingKeywords.forEach((k: any) => {
  const keyword = String(k.keyword || "").toLowerCase();

  let cluster = "General";

  if (/buy|price|pricing|cost|cheap|deal/.test(keyword)) {
    cluster = "Commercial";
  } else if (/best|top|vs|review|comparison/.test(keyword)) {
    cluster = "Comparison";
  } else if (/how|guide|tips|learn|what is/.test(keyword)) {
    cluster = "Informational";
  } else if (/near me|location|city|area/.test(keyword)) {
    cluster = "Local";
  } else if (/service|company|agency|firm/.test(keyword)) {
    cluster = "Service";
  }

  if (!keywordClusters[cluster]) {
    keywordClusters[cluster] = [];
  }

  keywordClusters[cluster].push(k);
});

const contentIdeas = Object.entries(keywordClusters).map(
  ([cluster, keywords]: any) => ({
    cluster,
    headline:
      keywords?.[0]?.keyword
        ? `Create content targeting "${keywords[0].keyword}"`
        : `Create ${cluster} content`,
    keywords: keywords.slice(0, 5),
  })
);

const keywordGapQuality =
  competitorDomains.length > 0 && missingKeywords.length > 0
    ? "available"
    : competitorDomains.length > 0 && categoryOpportunityKeywords.length > 0
      ? "category_only_unverified"
      : "not_enough_relevant_competitor_data";

const keywordGap = {
  ownKeywords: topKeywords.length,
  competitorCount: competitorDomains.length,
  competitorsChecked: competitorDomains,
  directCompetitorsUsed: directCompetitorDomains.length,
  categoryCompetitorsUsed: categoryCompetitorDomains.length,
  missingKeywords,
  opportunities: missingKeywords.slice(0, 10),
  /*
   * Separate, clearly labeled opportunity set sourced only from
   * category/vertical competitors whose business model could not be
   * verified. These never feed the main missingKeywords gap or its
   * "Competitors Checked" / "Missing Keywords" KPIs - they exist so
   * a report isn't left with zero keyword intelligence just because
   * no domain cleared the verified-direct bar, while still keeping
   * the direct-only rule intact for the primary gap.
   */
  categoryOpportunityKeywords,
  categoryOpportunityNote:
    categoryOpportunityKeywords.length > 0
      ? "These opportunities come from category/vertical competitors whose business model is unverified. Confirm relevance manually before prioritizing."
      : null,
  keywordClusters,
  contentIdeas,
  quality: keywordGapQuality,
  mode: "standard-non-branded",
  competitorBrandTermsExcluded:
    competitorBrandTokens,
  suppressedCompetitorBrandedKeywords,
  conquestModeAvailable: false,
};

    const backlinksData = {
      backlinks:
        backlinkSummaryItem?.backlinks ||
        backlinkSummaryItem?.total_backlinks ||
        0,
      referringDomains:
        backlinkSummaryItem?.referring_domains ||
        backlinkSummaryItem?.referring_main_domains ||
        0,
      referringPages: backlinkSummaryItem?.referring_pages || 0,
      dofollow: backlinkSummaryItem?.dofollow || 0,
      nofollow: backlinkSummaryItem?.nofollow || 0,
      rank: backlinkSummaryItem?.rank || backlinkSummaryItem?.domain_rank || 0,
      topBacklinks: backlinkItems.slice(0, 20).map((item: any) => ({
        sourceUrl: item.url_from || item.source_url || null,
        targetUrl: item.url_to || item.target_url || null,
        anchor: item.anchor || "",
        domainFrom: item.domain_from || "",
        rank: item.rank || 0,
      })),
    };

console.log("TRAFFIC DEBUG", {
  domain,
  locationCode: effectiveLocationCode,
  totalKeywordsFetched: topKeywords.length,
  trafficEligibleCount: trafficEligibleKeywords.length,
  organicTraffic,
  topKeyword: trafficDebug?.[0] || null,
  paginationRounds: Math.ceil(topKeywords.length / 1000),
});
    return NextResponse.json({
      success: true,
      dataforseo: {
        domain,
        detectedNiche,
country: locationName,
countryCode: null,
language: languageName,
languageCode: languageCode || "en",
locationCode: effectiveLocationCode,
device,
searchEngine,
source: "DataForSEO",
        organicTraffic,
organicTrafficRaw,
brandedTraffic: Math.round(brandedTraffic),
nonBrandedTraffic: Math.round(nonBrandedTraffic),
trafficLabel: "Estimated Monthly Organic Visits",
trafficConfidence,
trafficModel: "ctr-curve",
trafficMethod: "ctr-curve",
filteredKeywordCount,
rankedKeywordCount: topKeywords.length,
trafficNote:
  "Estimated from DataForSEO ranked keywords using search volume × CTR(position). This is a modeled visibility estimate, not analytics traffic.",
trafficDebug,
keywordFetchIterations,
keywordFetchStoppedReason,
totalRankedKeywordsFetched:
  allRankedKeywordItems.length,
totalRankedKeywordsAvailable,
        organicKeywords,
        backlinkRank: backlinksData.rank,
domainAuthority: null,
        topKeywords: visibleTopKeywords,
competitors:
  topCompetitors,

competitorLandscape,

backlinks:
  backlinksData,

keywordGap,
      },
    });
  } catch (error) {
    console.error("DataForSEO route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "DataForSEO route failed",
      },
      { status: 500 }
    );
  }
}