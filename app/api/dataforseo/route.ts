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
  niche = "general"
) {
  const value = String(keyword || "").toLowerCase();

  if (/vs|versus|comparison|alternative|alternatives/.test(value)) {
    return "Comparison Page";
  }

  if (intent === "informational") {
    return "Blog / Guide";
  }

  if (intent === "commercial") {
    if (niche === "ecommerce") {
      return /buy|price|shop|product/.test(value)
        ? "Product / Collection Page"
        : "Category Page";
    }

    if (niche === "saas") {
      return /software|platform|app|tool|solution/.test(value)
        ? "Feature / Solution Page"
        : "Commercial Landing Page";
    }

    if (niche === "real_estate") {
      return /near me|city|area|location|property/.test(value)
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
      return /near me|city|area|location/.test(value)
        ? "Service Location Page"
        : /software|solution|platform|samd|medical device|healthtech|healthcare/.test(
              value
            )
          ? "Service / Solution Page"
          : "Service Page";
    }

    if (niche === "software_development") {
      return /service|development|developer|company|agency|solution/.test(
        value
      )
        ? "Service / Solution Page"
        : "Supporting Content";
    }

    if (niche === "creator_platform") {
      return /platform|subscription|creator|monetization|monetisation/.test(
        value
      )
        ? "Solution / Landing Page"
        : "Supporting Content";
    }

    if (niche === "restaurant") {
      return /menu|delivery|order|near me/.test(value)
        ? "Menu / Location Page"
        : "Category Page";
    }

    return "Commercial Landing Page";
  }

  if (intent === "comparison") {
    return "Comparison Page";
  }

  return niche === "ecommerce" ? "Category Content" : "Supporting Content";
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
    String(body?.businessSeed || ""),
  siteContext:
    body?.siteContext &&
    typeof body.siteContext === "object"
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

const allowedCompetitorHints =
  getAllowedCompetitorHints(detectedNiche);

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
    const blockedCompetitors = [
  "youtube",
  "daraz",
"priceoye",
"telemart",
"alibaba",
"naheed",
"shophive",
"alfatah",
"olx",
"paklap",
"mega.pk",
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "x.com",
  "pinterest",
  "wikipedia",
  "amazon",
  "ebay",
  "reddit",
  "tiktok",
  "quora",
  "google",
  "apple",
  "walmart",
  "bestbuy",
  "getapp",
"softwareadvice",
"softwaresuggest",
"softwareworld",
"cloud.microsoft",
"microsoft",
"cloudflare",
  "techradar",
  "forbes",
  "medium",
  "nytimes",
  "cnn",
  "bbc",
];

    let topCompetitors = competitorItems
      .map((item: any) => {
        const competitorDomain = item?.domain || item?.target || "-";

        const sharedKeywords =
          item?.intersections ||
          item?.common_keywords ||
          item?.shared_keywords ||
          item?.metrics?.organic?.count ||
          0;

        return enrichCompetitorThreat({
  domain: competitorDomain,
  sharedKeywords: Number(sharedKeywords || 0),
  intersections: Number(sharedKeywords || 0),
  traffic: getCompetitorTrafficValue(item),
  rank: item?.rank || item?.competitor_rank || null,
  relevance: Math.min(100, Math.max(5, Number(sharedKeywords || 0) * 10)),
});
      })
      .filter((item: any) => {
        const d = String(item.domain || "").toLowerCase();

        const shared = Number(item.sharedKeywords || item.intersections || 0);
        const traffic = Number(item.traffic || 0);
        const trafficAvailable = item?.trafficAvailable === true;

return (
  d &&
  d !== domain.toLowerCase() &&
  !blockedCompetitors.some((blocked) => d.includes(blocked)) &&
  allowedCompetitorHints.some((hint) => d.includes(hint)) &&
  shared >= 3 &&
  trafficAvailable &&
  traffic > 0
);
      })
      .sort((a: any, b: any) => {
  const scoreA = Number(a.sharedKeywords || 0) * 10 + Number(a.traffic || 0);
  const scoreB = Number(b.sharedKeywords || 0) * 10 + Number(b.traffic || 0);
  return scoreB - scoreA;
})
      .slice(0, 10);

    if (topCompetitors.length === 0) {
  topCompetitors = competitorItems
    .map((item: any) => {
      const competitorDomain = item?.domain || item?.target || "-";

      const sharedKeywords =
        item?.intersections ||
        item?.common_keywords ||
        item?.shared_keywords ||
        item?.metrics?.organic?.count ||
        0;

      return enrichCompetitorThreat({
  domain: competitorDomain,
  sharedKeywords: Number(sharedKeywords || 0),
  intersections: Number(sharedKeywords || 0),
  traffic: getCompetitorTrafficValue(item),
  rank: item?.rank || item?.competitor_rank || null,
  relevance: Math.min(100, Math.max(5, Number(sharedKeywords || 0) * 10)),
});
    })
    .filter((item: any) => {
      const d = String(item.domain || "").toLowerCase();
      const shared = Number(item.sharedKeywords || item.intersections || 0);

      return (
        d &&
        d !== domain.toLowerCase() &&
        !blockedCompetitors.some((blocked) => d.includes(blocked)) &&
        shared >= 3
      );
    })
    .slice(0, 10);
}
topCompetitors = Array.from(
  new Map(
    topCompetitors.map((item: any) => [item.domain, item])
  ).values()
)
  .sort((a: any, b: any) => {
    if (Number(b.threatScore || 0) !== Number(a.threatScore || 0)) {
      return Number(b.threatScore || 0) - Number(a.threatScore || 0);
    }

    return Number(b.sharedKeywords || 0) - Number(a.sharedKeywords || 0);
  })
  .slice(0, 10);

    const ownKeywordSet = new Set(
      topKeywords
        .map((k: any) => String(k.keyword || "").toLowerCase().trim())
        .filter(Boolean)
    );

    const competitorDomains = topCompetitors
      .map((c: any) => c.domain)
      .filter(Boolean)
      .slice(0, 3);

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
      { keyword: string; volume: number; cpc: number; competition: number; competitors: string[] }
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

        if (existing) {
          if (!existing.competitors.includes(competitorDomain)) {
            existing.competitors.push(competitorDomain);
          }
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

const missingKeywords = Array.from(competitorKeywordMap.values())
  .map((k: any) => {
    const intent = getKeywordIntent(k.keyword);
    const opportunityScore = calculateKeywordOpportunityScore(k);
    const recommendedPageType = getRecommendedPageType(
      k.keyword,
      intent,
      detectedNiche
    );

    return {
      ...k,
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

    const isRelevantToBrandCategory =
      topKeywords.some((own: any) => {
        const ownKeyword = String(own.keyword || "").toLowerCase();
        return ownKeyword
          .split(" ")
          .some((word) => word.length > 4 && keyword.includes(word));
      });

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
  (isRelevantToBrandCategory || isStrongBusinessIntent) &&
  keywordVolume >= 20 &&
(competitorCoverage >= 2 || isStrongBusinessIntent)
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
    : "not_enough_relevant_competitor_data";

const keywordGap = {
  ownKeywords: topKeywords.length,
  competitorCount: competitorDomains.length,
  competitorsChecked: competitorDomains,
  missingKeywords,
  opportunities: missingKeywords.slice(0, 10),
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
        competitors: topCompetitors,
        backlinks: backlinksData,
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