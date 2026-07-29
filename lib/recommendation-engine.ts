export type RecommendationImpact = "High" | "Medium" | "Low";
export type RecommendationEffort = "Low" | "Medium" | "High";
export type RecommendationValidation =
  | "validated"
  | "limited"
  | "directional";

export type EvidenceBackedRecommendation = {
  id: string;
  title: string;
  detail: string;
  sourceModule: string;
  impact: RecommendationImpact;
  effort: RecommendationEffort;
  owner: string;
  timeline: "0–30 days" | "31–60 days" | "61–90 days";
  expectedImpact: string;
  affectedUrls: string[];
  evidence: string[];
  validationStatus: RecommendationValidation;
  confidence: "high" | "moderate" | "limited" | "directional";
  keyword?: string | null;
  recommendedPageType?: string | null;
};

export type ActionRoadmap = {
  first30Days: EvidenceBackedRecommendation[];
  next30Days: EvidenceBackedRecommendation[];
  final30Days: EvidenceBackedRecommendation[];
};

type JsonRecord = Record<string, any>;

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function normalizeDomain(value: unknown): string {
  const raw = text(value).toLowerCase();
  if (!raw) return "";

  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
      .hostname
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  } catch {
    return raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0]
      .replace(/\.$/, "");
  }
}

function normalizeKeyword(value: unknown): string {
  return text(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value: string): string {
  return normalizeKeyword(value).replace(/\s+/g, "-").slice(0, 80);
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => text(value))
        .filter(Boolean)
    )
  );
}

function rootBrandToken(value: unknown): string {
  const domain = normalizeDomain(value);
  return domain
    .split(".")[0]
    .replace(/[^a-z0-9]/g, "")
    .toLowerCase();
}

function inferBusinessType(input: JsonRecord): string {
  const explicit = text(
    input.businessType ||
      input.detectedNiche ||
      input.dataforseo?.detectedNiche
  ).toLowerCase();

  if (explicit) return explicit;

  const sample = [
    input.domain,
    input.seedKeyword,
    input.canonicalSeo?.title,
    input.title,
    ...asArray(input.dataforseo?.topKeywords)
      .slice(0, 15)
      .map((item) => item?.keyword),
  ]
    .join(" ")
    .toLowerCase();

  if (/shop|store|buy|product|collection|cart|checkout|ecommerce|e-commerce/.test(sample)) {
    return "ecommerce";
  }

  if (/software|saas|platform|crm|app|automation|cloud|tool/.test(sample)) {
    return "saas";
  }

  if (/publisher|news|magazine|editorial|articles|media/.test(sample)) {
    return "publisher";
  }

  if (/realtor|real estate|property|broker|multifamily/.test(sample)) {
    return "real_estate";
  }

  if (/law|lawyer|attorney|legal/.test(sample)) return "legal";
  if (/clinic|doctor|medical|health|dental/.test(sample)) return "healthcare";
  if (/restaurant|cafe|food|menu/.test(sample)) return "restaurant";
  if (/agency|service|consulting|repair|plumber|roofing|hvac|local/.test(sample)) {
    return "local_service";
  }

  return "general";
}

function pageTypeForBusiness(
  businessType: string,
  keyword: string,
  incomingPageType: unknown
): string {
  const normalized = normalizeKeyword(keyword);
  const explicit = text(incomingPageType);

  if (/vs|versus|alternative|comparison|review/.test(normalized)) {
    return "Comparison Page";
  }

  if (businessType === "ecommerce") {
    if (/how|guide|what|tips/.test(normalized)) return "Buying Guide / Article";
    if (/category|collection|best|top/.test(normalized)) return "Collection / Category Page";
    return "Product / Collection Page";
  }

  if (businessType === "saas") {
    if (/how|guide|what|tips/.test(normalized)) return "Use-Case Guide / Article";
    return "Feature / Solution Page";
  }

  if (["local_service", "real_estate", "legal", "healthcare", "restaurant"].includes(businessType)) {
    if (/near me|city|location|area/.test(normalized)) return "Service / Location Page";
    if (/how|guide|what|tips/.test(normalized)) return "Local Guide / Article";
    return "Service / Location Page";
  }

  if (businessType === "publisher") {
    return /best|top|guide|how|what/.test(normalized)
      ? "Topic Hub / Editorial Guide"
      : "Article / Topic Page";
  }

  return explicit && !/service \/ landing page/i.test(explicit)
    ? explicit
    : /how|guide|what|tips/.test(normalized)
      ? "Guide / Article"
      : "Landing Page";
}

function getCompetitorTokens(input: JsonRecord): string[] {
  const competitors = asArray(input.competitors).concat(
    asArray(input.dataforseo?.competitors)
  );

  return Array.from(
    new Set(
      competitors
        .flatMap((item) => {
          const domain = normalizeDomain(item?.domain || item?.url || item);
          const root = rootBrandToken(domain);
          const label = normalizeKeyword(item?.brand || item?.name || "").replace(/\s+/g, "");
          return [root, label];
        })
        .filter((token) => token.length >= 4)
    )
  );
}

function isCompetitorBrandedKeyword(
  keyword: string,
  competitorTokens: string[],
  ownBrandToken: string
): boolean {
  const compact = normalizeKeyword(keyword).replace(/\s+/g, "");
  if (!compact) return true;

  if (ownBrandToken && compact.includes(ownBrandToken)) return true;

  return competitorTokens.some(
    (token) => token && compact.includes(token)
  );
}

function getKeywordGaps(input: JsonRecord) {
  const raw = asArray(input.keywordGaps)
    .concat(asArray(input.keywordGap?.missingKeywords))
    .concat(asArray(input.dataforseo?.keywordGap?.missingKeywords));

  const competitorTokens = getCompetitorTokens(input);
  const ownBrandToken = rootBrandToken(input.domain || input.normalizedDomain);
  const seen = new Set<string>();
  const filtered: JsonRecord[] = [];
  let suppressed = 0;

  for (const item of raw) {
    const keyword = text(item?.keyword || item?.query || item?.name);
    const key = normalizeKeyword(keyword);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (isCompetitorBrandedKeyword(keyword, competitorTokens, ownBrandToken)) {
      suppressed += 1;
      continue;
    }

    filtered.push({ ...asRecord(item), keyword });
  }

  return {
    items: filtered.sort((a, b) => {
      const scoreA = toNumber(a?.opportunityScore) || 0;
      const scoreB = toNumber(b?.opportunityScore) || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (toNumber(b?.volume) || 0) - (toNumber(a?.volume) || 0);
    }),
    suppressed,
  };
}

function technicalContext(input: JsonRecord) {
  const onPage = asRecord(input.onPage || input.technicalCrawl);
  const state = text(
    onPage.crawlStatus ||
      input.moduleStatus?.technical ||
      input.reconciliation?.technical?.state
  ).toLowerCase();
  const confidence = text(
    onPage.confidence || input.reconciliation?.technical?.confidence
  ).toLowerCase();
  const pages = asArray(onPage.pages);
  const crawledPages =
    toNumber(onPage.crawledPages) ??
    toNumber(onPage.pagesCrawled) ??
    pages.length;

  return {
    onPage,
    state,
    confidence,
    pages,
    crawledPages,
    usable:
      crawledPages > 0 &&
      !["unavailable", "processing", "not-selected"].includes(confidence),
    limited:
      ["limited", "moderate"].includes(confidence) ||
      ["partial", "failed", "timed_out"].includes(state) ||
      onPage.isPartial === true,
  };
}

function issueEvidence(issue: JsonRecord, fallbackUrl: string): string[] {
  return uniqueStrings([
    issue.affectedUrl,
    issue.url,
    issue.impact,
    issue.description,
    issue.fix,
    fallbackUrl,
  ]).slice(0, 4);
}

function sortRecommendations(items: EvidenceBackedRecommendation[]) {
  const impactRank: Record<RecommendationImpact, number> = {
    High: 3,
    Medium: 2,
    Low: 1,
  };
  const validationRank: Record<RecommendationValidation, number> = {
    validated: 3,
    limited: 2,
    directional: 1,
  };

  return [...items].sort((a, b) => {
    const impact = impactRank[b.impact] - impactRank[a.impact];
    if (impact) return impact;
    return validationRank[b.validationStatus] - validationRank[a.validationStatus];
  });
}

export function buildEvidenceBackedRecommendations(inputValue: unknown) {
  const input = asRecord(inputValue);
  const businessType = inferBusinessType(input);
  const canonicalSeo = asRecord(input.canonicalSeo);
  const resolvedUrl = text(
    canonicalSeo.homepageUrl ||
      input.canonicalUrl ||
      input.resolvedUrl ||
      input.url ||
      input.domain
  );
  const recommendations: EvidenceBackedRecommendation[] = [];
  const seen = new Set<string>();

  const add = (item: Omit<EvidenceBackedRecommendation, "id">) => {
    const key = `${item.sourceModule}:${normalizeKeyword(item.title)}`;
    if (!normalizeKeyword(item.title) || seen.has(key)) return;
    seen.add(key);
    recommendations.push({
      id: `${slug(item.sourceModule)}-${slug(item.title)}`,
      ...item,
      affectedUrls: uniqueStrings(item.affectedUrls).slice(0, 10),
      evidence: uniqueStrings(item.evidence).slice(0, 8),
    });
  };

  const title = text(canonicalSeo.title || input.title);
  const description = text(canonicalSeo.metaDescription || input.description);
  const h1 = text(canonicalSeo.h1 || input.h1);

  if (!title) {
    add({
      title: "Add a unique title to the resolved homepage",
      detail:
        "The resolved canonical homepage does not expose a usable title. Add a descriptive title that matches the page's primary search intent.",
      sourceModule: "SEO Foundation",
      impact: "High",
      effort: "Low",
      owner: "SEO / Development",
      timeline: "0–30 days",
      expectedImpact: "Improves indexing clarity and search-result relevance.",
      affectedUrls: [resolvedUrl],
      evidence: ["Resolved homepage title: missing", resolvedUrl],
      validationStatus: "validated",
      confidence: "high",
    });
  }

  if (!description) {
    add({
      title: "Add a meta description to the resolved homepage",
      detail:
        "Add a unique 140–160 character description that explains the offer and gives searchers a clear reason to click.",
      sourceModule: "SEO Foundation",
      impact: "Medium",
      effort: "Low",
      owner: "SEO / Content",
      timeline: "0–30 days",
      expectedImpact: "Improves search-snippet quality and click-through potential.",
      affectedUrls: [resolvedUrl],
      evidence: ["Resolved homepage meta description: missing", resolvedUrl],
      validationStatus: "validated",
      confidence: "high",
    });
  }

  if (!h1) {
    add({
      title: "Add one clear H1 to the resolved homepage",
      detail:
        "Use one visible H1 that defines the page's primary product, service, or topic without relying on decorative text.",
      sourceModule: "SEO Foundation",
      impact: "Medium",
      effort: "Low",
      owner: "SEO / Content",
      timeline: "0–30 days",
      expectedImpact: "Improves content hierarchy and topical clarity.",
      affectedUrls: [resolvedUrl],
      evidence: ["Resolved homepage H1: missing", resolvedUrl],
      validationStatus: "validated",
      confidence: "high",
    });
  }

  const mobileScore =
    toNumber(input.pageSpeed?.mobile?.score) ??
    toNumber(input.mobilePerformance) ??
    toNumber(input.performance?.mobileScore);

  if (mobileScore !== null && mobileScore < 75) {
    add({
      title: "Improve mobile loading performance",
      detail:
        "Reduce render-blocking scripts, optimize the largest above-the-fold asset, compress images, and improve caching before adding more page weight.",
      sourceModule: "Performance",
      impact: "High",
      effort: "Medium",
      owner: "Development",
      timeline: "0–30 days",
      expectedImpact: "Improves mobile UX, conversion efficiency, and Core Web Vitals.",
      affectedUrls: [resolvedUrl],
      evidence: [`Mobile PageSpeed score: ${mobileScore}/100`, resolvedUrl],
      validationStatus: "validated",
      confidence: "high",
    });
  }

  const technical = technicalContext(input);
  const technicalIssues = asArray(input.issues).filter((issue) =>
    /(crawl|broken link|duplicate|status code|redirect|missing title|missing description)/i.test(
      text(issue?.title || issue?.issue)
    )
  );

  if (technical.usable) {
    const brokenLinks = toNumber(technical.onPage.brokenLinks) || 0;
    const failedPages = toNumber(technical.onPage.failedPages) || 0;
    const affectedUrls = technical.pages
      .filter((page) => {
        const status = toNumber(page?.statusCode);
        return status !== null && status >= 400;
      })
      .map((page) => page?.url)
      .filter(Boolean);

    if (brokenLinks > 0 || failedPages > 0) {
      add({
        title: technical.limited
          ? "Fix validated crawl failures within the inspected page set"
          : "Fix broken links and failed crawl responses",
        detail: technical.limited
          ? "Resolve the evidenced failures below, then rerun a wider crawl before making a site-wide completeness claim."
          : "Repair or redirect broken internal links and investigate failed status codes returned by the completed crawl.",
        sourceModule: "Technical SEO",
        impact: "High",
        effort: "Medium",
        owner: "Development / SEO",
        timeline: "0–30 days",
        expectedImpact: "Improves crawl efficiency, user navigation, and indexable page quality.",
        affectedUrls,
        evidence: [
          `Pages inspected: ${technical.crawledPages}`,
          `Broken links: ${brokenLinks}`,
          `Failed pages: ${failedPages}`,
          `Crawl confidence: ${technical.confidence || "unknown"}`,
        ],
        validationStatus: technical.limited ? "limited" : "validated",
        confidence: technical.limited ? "limited" : "high",
      });
    }

    technicalIssues.slice(0, 2).forEach((issue) => {
      add({
        title: text(issue?.title || issue?.issue || "Resolve validated technical issue"),
        detail: text(
          issue?.description ||
            issue?.fix ||
            issue?.recommendation ||
            "Resolve this evidenced issue and verify it in the next crawl."
        ),
        sourceModule: "Technical SEO",
        impact: /critical|high/i.test(text(issue?.severity || issue?.impact))
          ? "High"
          : "Medium",
        effort: "Medium",
        owner: "Development / SEO",
        timeline: "0–30 days",
        expectedImpact: "Removes a validated technical obstacle from the inspected page set.",
        affectedUrls: uniqueStrings([issue?.affectedUrl, issue?.url]),
        evidence: issueEvidence(issue, resolvedUrl),
        validationStatus: technical.limited ? "limited" : "validated",
        confidence: technical.limited ? "limited" : "high",
      });
    });
  }

  const keywordGapResult = getKeywordGaps(input);
  const topGap = keywordGapResult.items[0];

  if (topGap) {
    const keyword = text(topGap.keyword);
    const pageType = pageTypeForBusiness(
      businessType,
      keyword,
      topGap.recommendedPageType
    );
    const competitorNames = asArray(topGap.competitors).map((value) => text(value));

    add({
      title: `Create or improve a ${pageType.toLowerCase()} for “${keyword}”`,
      detail:
        `Use the validated non-branded gap as a focused page brief. Match the search intent, cover the decision criteria competitors address, and connect the page to relevant internal links.`,
      sourceModule: "Keyword Intelligence",
      impact: (toNumber(topGap.opportunityScore) || 0) >= 70 ? "High" : "Medium",
      effort: pageType.includes("Article") ? "Medium" : "High",
      owner: "SEO / Content",
      timeline: "31–60 days",
      expectedImpact: "Expands qualified non-branded search coverage and commercial discovery.",
      affectedUrls: uniqueStrings([topGap.url]),
      evidence: [
        `Keyword: ${keyword}`,
        `Search volume: ${toNumber(topGap.volume) ?? "not available"}`,
        `Opportunity score: ${toNumber(topGap.opportunityScore) ?? "not available"}/100`,
        competitorNames.length
          ? `Competitor coverage: ${competitorNames.join(", ")}`
          : "Competitor coverage detected",
        `Recommended page type: ${pageType}`,
      ],
      validationStatus: "validated",
      confidence: "moderate",
      keyword,
      recommendedPageType: pageType,
    });
  }

  const aiScore =
    toNumber(input.aiSearchVisibility?.overallScore) ??
    toNumber(input.aiVisibilityScore) ??
    toNumber(input.aiScore);
  const aiConfidence = text(
    input.aiSearchVisibility?.confidence || input.aiVisibilityConfidence
  ).toLowerCase();

  if (aiScore !== null && aiScore < 70) {
    add({
      title: "Strengthen unbranded AI category visibility",
      detail:
        "Improve entity clarity, category-focused content, trusted citations, structured data, and expert proof around the unbranded prompts where the brand was missed.",
      sourceModule: "AI Search Visibility",
      impact: "High",
      effort: "High",
      owner: "SEO / Content / Digital PR",
      timeline: "31–60 days",
      expectedImpact: "Increases the likelihood of being mentioned or cited in category-level AI answers.",
      affectedUrls: asArray(input.aiSearchVisibility?.rankedPages)
        .slice(0, 5)
        .map((page) => page?.url || page?.path),
      evidence: [
        `Canonical AI visibility score: ${aiScore}/100`,
        `Confidence: ${aiConfidence || "low"}`,
        ...asArray(input.aiSearchVisibility?.missedPrompts)
          .slice(0, 3)
          .map((prompt) => `Missed prompt: ${text(prompt)}`),
      ],
      validationStatus: aiConfidence === "high" || aiConfidence === "moderate"
        ? "validated"
        : "directional",
      confidence: aiConfidence === "high" ? "high" : aiConfidence === "moderate" ? "moderate" : "directional",
    });
  }

  const referringDomains =
    toNumber(input.backlinks?.referringDomains) ??
    toNumber(input.dataforseo?.backlinks?.referringDomains);

  if (referringDomains !== null && referringDomains < 25) {
    add({
      title: "Earn relevant referring domains from trusted industry sources",
      detail:
        "Prioritize editorial mentions, partner links, resource pages, and credible directories that are relevant to the audited business category.",
      sourceModule: "Backlink Authority",
      impact: "Medium",
      effort: "High",
      owner: "Digital PR / SEO",
      timeline: "61–90 days",
      expectedImpact: "Improves authority, discoverability, and third-party trust signals.",
      affectedUrls: [resolvedUrl],
      evidence: [`Referring domains: ${referringDomains}`],
      validationStatus: "validated",
      confidence: "moderate",
    });
  }

  const ownContentResults = asArray(input.contentAnalysis?.results).filter((item) => {
    const itemDomain = normalizeDomain(item?.domain || item?.url);
    const auditedDomain = normalizeDomain(input.domain || input.normalizedDomain);
    return itemDomain && auditedDomain && itemDomain === auditedDomain;
  });
  const weakContent = ownContentResults
    .filter((item) => (toNumber(item?.score) ?? 100) < 70)
    .sort((a, b) => (toNumber(a?.score) || 0) - (toNumber(b?.score) || 0))[0];

  if (weakContent) {
    add({
      title: `Improve content depth and trust on ${text(weakContent.title || weakContent.url || "a weak page")}`,
      detail:
        "Expand the page around its primary intent, strengthen headings and evidence, remove thin sections, and add relevant internal links and structured data.",
      sourceModule: "Content Quality",
      impact: "Medium",
      effort: "Medium",
      owner: "Content / SEO",
      timeline: "31–60 days",
      expectedImpact: "Improves topical completeness and the page's ability to rank, convert, and support AI citations.",
      affectedUrls: [text(weakContent.url)],
      evidence: [
        `Content score: ${toNumber(weakContent.score) ?? "not available"}/100`,
        `Word count: ${toNumber(weakContent.wordCount || weakContent.contentLength) ?? "not available"}`,
        ...asArray(weakContent.issues).slice(0, 3).map((issue) => text(issue)),
      ],
      validationStatus: "validated",
      confidence: "moderate",
    });
  }

  const traffic =
    toNumber(input.traffic?.rawMonthly) ??
    toNumber(input.traffic?.monthly) ??
    toNumber(input.monthlyTraffic);
  const keywordCount =
    toNumber(input.traffic?.rankedKeywordCount) ??
    toNumber(input.keywordCount) ??
    toNumber(input.organicKeywords);

  if ((traffic === null || traffic <= 0) && !topGap) {
    add({
      title: "Build measurable non-branded organic visibility",
      detail:
        "Create a focused set of commercially relevant pages, improve indexing, and measure progress against the canonical keyword and traffic model in the next audit.",
      sourceModule: "Traffic Intelligence",
      impact: "High",
      effort: "High",
      owner: "SEO / Content",
      timeline: "31–60 days",
      expectedImpact: "Creates a measurable organic acquisition surface where current visibility is weak or unavailable.",
      affectedUrls: [resolvedUrl],
      evidence: [
        `Estimated monthly organic visits: ${traffic ?? "insufficient data"}`,
        `Ranked keyword count: ${keywordCount ?? "not available"}`,
      ],
      validationStatus: traffic === null ? "directional" : "validated",
      confidence: traffic === null ? "directional" : "moderate",
    });
  }

  const sorted = sortRecommendations(recommendations).slice(0, 10);
  const roadmap = buildActionRoadmap(sorted);

  return {
    recommendations: sorted,
    roadmap,
    businessType,
    filteredKeywordGaps: keywordGapResult.items,
    suppressedCompetitorBrandedKeywords: keywordGapResult.suppressed,
    source: "Crawler Que Evidence-Backed Recommendation Engine",
    methodologyVersion: "3.0",
  };
}

export function buildActionRoadmap(
  recommendations: EvidenceBackedRecommendation[]
): ActionRoadmap {
  return {
    first30Days: recommendations.filter(
      (item) => item.timeline === "0–30 days"
    ),
    next30Days: recommendations.filter(
      (item) => item.timeline === "31–60 days"
    ),
    final30Days: recommendations.filter(
      (item) => item.timeline === "61–90 days"
    ),
  };
}
