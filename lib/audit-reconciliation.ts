import {
  buildEvidenceBackedRecommendations,
} from "@/lib/recommendation-engine";

type JsonRecord = Record<string, any>;

type ReconcileOptions = {
  renderReady?: boolean;
  reportStatus?: string;
  completedAt?: string | null;
};

const FINAL_TECHNICAL_STATES = new Set(["completed", "partial", "failed", "timed_out", "skipped"]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function normalizeDomain(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  } catch {
    return raw
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0]
      .replace(/\.$/, "");
  }
}

function decodeHtmlEntities(value: string) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_match, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/\s+/g, " ")
    .trim();
}

function readText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return decodeHtmlEntities(String(value));
  }
  return "";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = readText(value);
    if (text) return text;
  }
  return "";
}

function readH1(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(readText).find(Boolean) || "";
  }
  return readText(value);
}

function getTechnicalState(report: JsonRecord) {
  const state = firstText(
    report?.onPage?.crawlStatus,
    report?.moduleStatus?.technical,
    report?.moduleStatus?.onPage,
    report?.technicalState,
    "skipped"
  ).toLowerCase();

  if (["started", "pending", "queued", "processing"].includes(state)) {
    return "running";
  }

  if (report?.onPage?.isPartial === true && state === "completed") {
    return "partial";
  }

  return state;
}

function findHomepage(report: JsonRecord) {
  const pages = asArray(report?.onPage?.pages);
  if (!pages.length) return null;

  const preferredUrls = [
    report?.canonicalUrl,
    report?.resolvedUrl,
    report?.url,
  ]
    .map(normalizeUrl)
    .filter(Boolean);

  const exact = pages.find((page) => {
    const pageUrl = normalizeUrl(page?.url);
    return pageUrl && preferredUrls.includes(pageUrl);
  });

  if (exact) return exact;

  const targetDomain = normalizeDomain(
    report?.normalizedDomain || report?.domain || report?.url
  );

  const domainHomepage = pages.find((page) => {
    const pageUrl = readText(page?.url);
    if (!pageUrl || normalizeDomain(pageUrl) !== targetDomain) return false;

    try {
      const pathname = new URL(pageUrl).pathname.replace(/\/+$/, "");
      return pathname === "";
    } catch {
      return false;
    }
  });

  return domainHomepage || pages[0] || null;
}

function technicalConfidence(state: string, pagesCrawled: number) {
  if (state === "completed") return "high";
  if (state === "partial" && pagesCrawled > 0) return "moderate";
  if (["failed", "timed_out"].includes(state) && pagesCrawled > 0) return "limited";
  if (["failed", "timed_out"].includes(state)) return "unavailable";
  if (state === "running") return "processing";
  return "not-selected";
}

function reconcileIssues(report: JsonRecord, canonicalSeo: JsonRecord, technicalState: string, pagesCrawled: number) {
  const incoming = asArray(report?.issues).filter(isRecord);

  const filtered = incoming.filter((issue) => {
    const title = firstText(issue?.title, issue?.issue).toLowerCase();

    if (canonicalSeo.title && /missing (page )?title/.test(title)) return false;
    if (canonicalSeo.metaDescription && /missing meta description/.test(title)) return false;
    if (canonicalSeo.h1 && /missing h1/.test(title)) return false;

    if (
      pagesCrawled === 0 &&
      ["partial", "failed", "timed_out"].includes(technicalState) &&
      /(broken link|duplicate title|duplicate description|missing title tags|missing descriptions|crawl)/.test(title)
    ) {
      return false;
    }

    return true;
  });

  const addIssue = (title: string, severity: string, impact: string, fix: string) => {
    if (!filtered.some((issue) => firstText(issue?.title, issue?.issue).toLowerCase() === title.toLowerCase())) {
      filtered.push({
        title,
        severity,
        impact,
        fix,
        sourceModule: "seo",
        validationStatus: "reconciled",
      });
    }
  };

  if (!canonicalSeo.title) {
    addIssue(
      "Missing page title",
      "high",
      "The resolved homepage does not expose a usable page title.",
      "Add a unique, descriptive title to the resolved canonical homepage."
    );
  }

  if (!canonicalSeo.metaDescription) {
    addIssue(
      "Missing meta description",
      "medium",
      "The resolved homepage does not expose a usable meta description.",
      "Add a concise description to the resolved canonical homepage."
    );
  }

  if (!canonicalSeo.h1) {
    addIssue(
      "Missing H1 heading",
      "medium",
      "The resolved homepage does not expose a clear H1 heading.",
      "Add one clear H1 describing the page's primary offer."
    );
  }

  return filtered;
}

function canonicalAiCompatibility(aiSearchVisibility: JsonRecord | null) {
  if (!aiSearchVisibility) return null;

  const promptResults = asArray(aiSearchVisibility?.promptResults);
  const models: JsonRecord[] = [];

  promptResults.forEach((promptRow) => {
    const prompt = firstText(promptRow?.prompt);
    const modelRows = asRecord(promptRow?.models);

    Object.entries(modelRows).forEach(([model, rawResult]) => {
      const result = asRecord(rawResult);
      models.push({
        model,
        prompt,
        mentioned: result?.mentioned === true,
        position: numberOrNull(result?.position),
        sentiment: firstText(result?.sentiment) || null,
        responseSnippet: firstText(result?.snippet),
        competitors: asArray(result?.competitors),
        sources: asArray(result?.sources),
      });
    });
  });

  return {
    methodologyVersion: firstText(aiSearchVisibility?.methodologyVersion, "2.0"),
    source: firstText(aiSearchVisibility?.source, "Live AI Models (ChatGPT, Claude, Gemini)"),
    visibilityScore: numberOrNull(aiSearchVisibility?.overallScore),
    rawVisibilityScore: numberOrNull(aiSearchVisibility?.overallScore),
    confidence: firstText(aiSearchVisibility?.confidence, "low"),
    scoreLabel: "Canonical AI Search Visibility",
    totalMentions: numberOrNull(aiSearchVisibility?.brandMentionCount) || 0,
    totalModels: asArray(aiSearchVisibility?.modelsExpected).length || 3,
    validModelCount: asArray(aiSearchVisibility?.modelsCalled).length,
    brandName: firstText(aiSearchVisibility?.brand),
    industry: firstText(aiSearchVisibility?.industry),
    aiCompetitors: asArray(aiSearchVisibility?.topCompetitors),
    competitors: asArray(aiSearchVisibility?.topCompetitors),
    models,
    promptResults,
    pageInsights: {
      totalPagesAnalyzed: asArray(aiSearchVisibility?.rankedPages).length,
      topPerformingPages: asArray(aiSearchVisibility?.rankedPages).slice(0, 5),
      pagesNeedingOptimization: [],
    },
    canonical: true,
  };
}

function calculateSeoScore(canonicalSeo: JsonRecord) {
  return clamp(
    100 -
      (!canonicalSeo.title ? 15 : 0) -
      (!canonicalSeo.metaDescription ? 15 : 0) -
      (!canonicalSeo.h1 ? 15 : 0) -
      ((numberOrNull(canonicalSeo.imagesMissingAlt) || 0) > 0 ? 10 : 0)
  );
}

function calculateUxScore(report: JsonRecord, canonicalSeo: JsonRecord) {
  const mobileScore = numberOrNull(report?.pageSpeed?.mobile?.score) || 0;
  return clamp(
    95 -
      (mobileScore > 0 && mobileScore < 60 ? 15 : 0) -
      ((numberOrNull(canonicalSeo.imagesMissingAlt) || 0) > 0 ? 5 : 0)
  );
}

function calculateBacklinkScore(report: JsonRecord) {
  const referringDomains = numberOrNull(report?.backlinks?.referringDomains) || 0;
  if (referringDomains > 50) return 85;
  if (referringDomains > 20) return 65;
  if (referringDomains > 5) return 45;
  return report?.backlinks ? 25 : null;
}

function calculateOverallScore(input: {
  seoScore: number;
  uxScore: number;
  mobileScore: number | null;
  backlinkScore: number | null;
  aiScore: number | null;
}) {
  const components = [
    { value: input.seoScore, weight: 30 },
    { value: input.uxScore, weight: 15 },
    { value: input.mobileScore, weight: 25 },
    { value: input.backlinkScore, weight: 15 },
    { value: input.aiScore, weight: 15 },
  ].filter((component): component is { value: number; weight: number } =>
    component.value !== null && Number.isFinite(component.value)
  );

  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  if (!totalWeight) return 0;

  return Math.round(
    components.reduce((sum, component) => sum + component.value * component.weight, 0) /
      totalWeight
  );
}

function selectBiggestIssue(issues: any[], aiScore: number | null, technicalState: string) {
  const highSeverity = issues.find((issue) =>
    ["critical", "high"].includes(firstText(issue?.severity, issue?.impact).toLowerCase())
  );

  if (highSeverity) return firstText(highSeverity?.title, highSeverity?.issue);
  if (["partial", "failed", "timed_out"].includes(technicalState)) return "Technical crawl completed with limited coverage";
  if (aiScore !== null && aiScore < 40) return "Low AI search visibility";
  return firstText(issues?.[0]?.title, issues?.[0]?.issue, "No critical issue detected from the available data");
}

function selectBiggestOpportunity(report: JsonRecord, aiScore: number | null) {
  if (asArray(report?.dataforseo?.keywordGap?.missingKeywords).length > 0) {
    return "Validated non-branded keyword gaps";
  }

  if (aiScore !== null && aiScore < 70) return "Improve unbranded AI category visibility";
  if ((numberOrNull(report?.traffic?.rawMonthly) || 0) <= 0) return "Build measurable organic search visibility";
  return "Strengthen authority and conversion-focused content";
}

export function reconcileAuditReport(
  inputReport: unknown,
  options: ReconcileOptions = {}
): JsonRecord {
  const report = asRecord(inputReport);
  const technicalState = getTechnicalState(report);
  const onPage = asRecord(report?.onPage);
  const pages = asArray(onPage?.pages);
  const pagesCrawled =
    numberOrNull(onPage?.crawledPages) ??
    numberOrNull(onPage?.pagesCrawled) ??
    pages.length;

  const homepage = findHomepage(report);
  const homepageMeta = asRecord(homepage?.meta);
  const homepageHtags = asRecord(homepageMeta?.htags || homepage?.htags);

  const initialH1 = readH1(report?.h1);
  const technicalCanOverride = Boolean(homepage) && ["completed", "partial", "failed", "timed_out"].includes(technicalState);

  const canonicalSeo = {
    source: technicalCanOverride
      ? "resolved-homepage-html-with-technical-corroboration"
      : "resolved-homepage-html",
    title: firstText(
      report?.title,
      report?.seoChecks?.title,
      report?.metadata?.title,
      homepage?.title,
      homepageMeta?.title
    ),
    metaDescription: firstText(
      report?.description,
      report?.metaDescription,
      report?.seoChecks?.metaDescription,
      homepage?.description,
      homepageMeta?.description
    ),
    h1: firstText(
      report?.h1,
      report?.seoChecks?.h1,
      initialH1,
      readH1(homepage?.h1 || homepageHtags?.h1)
    ),
    h1Count: Math.max(
      numberOrNull(report?.h1Count) || 0,
      asArray(homepage?.h1 || homepageHtags?.h1).length,
      readH1(homepage?.h1 || homepageHtags?.h1) ? 1 : 0,
      initialH1 ? 1 : 0
    ),
    imagesMissingAlt:
      numberOrNull(report?.imagesMissingAlt) ??
      numberOrNull(report?.missingAltCount) ??
      numberOrNull(report?.seoChecks?.missingAlt) ??
      0,
    homepageUrl: firstText(homepage?.url, report?.canonicalUrl, report?.resolvedUrl, report?.url),
  };

  const aiSearchVisibility = isRecord(report?.aiSearchVisibility)
    ? asRecord(report.aiSearchVisibility)
    : null;

  const aiScore = aiSearchVisibility
    ? numberOrNull(aiSearchVisibility?.overallScore)
    : null;

  const canonicalTraffic = {
    monthly:
      numberOrNull(report?.traffic?.rawMonthly) ??
      numberOrNull(report?.traffic?.monthly),
    daily: numberOrNull(report?.traffic?.daily),
    keywordCount:
      numberOrNull(report?.traffic?.rankedKeywordCount) ??
      numberOrNull(report?.dataforseo?.rankedKeywordCount) ??
      numberOrNull(report?.dataforseo?.totalRankedKeywordsFetched) ??
      numberOrNull(report?.traffic?.keywordCount),
    confidence: firstText(report?.traffic?.confidence, "insufficient-data"),
    method: firstText(report?.traffic?.method, report?.dataforseo?.trafficMethod, "ctr-curve"),
    source: "traffic-intelligence",
  };

  if (canonicalTraffic.monthly !== null && canonicalTraffic.daily === null) {
    canonicalTraffic.daily = Math.round(canonicalTraffic.monthly / 30);
  }

  const seoScore = calculateSeoScore(canonicalSeo);
  const uxScore = calculateUxScore(report, canonicalSeo);
  const mobileScore = numberOrNull(report?.pageSpeed?.mobile?.score);
  const backlinkScore = calculateBacklinkScore(report);
  const overallScore = calculateOverallScore({
    seoScore,
    uxScore,
    mobileScore,
    backlinkScore,
    aiScore,
  });

  const issues = reconcileIssues(report, canonicalSeo, technicalState, pagesCrawled);
  const biggestIssue = selectBiggestIssue(issues, aiScore, technicalState);
  const fallbackBiggestOpportunity = selectBiggestOpportunity(report, aiScore);
  const aiCompatibility = canonicalAiCompatibility(aiSearchVisibility);

  const selectedReportTypes = asArray(report?.reportTypes).map((value) =>
    firstText(value).toLowerCase()
  );
  const recommendationsSelected =
    selectedReportTypes.includes("recommendations") ||
    selectedReportTypes.includes("ai");

  const recommendationResult = buildEvidenceBackedRecommendations({
    ...report,
    canonicalSeo,
    onPage: {
      ...onPage,
      crawledPages: pagesCrawled,
      pagesCrawled,
      crawlStatus: technicalState,
      confidence: technicalConfidence(technicalState, pagesCrawled),
    },
    issues,
    overallScore,
    seoScore,
    uxScore,
    aiScore,
  });
  const canonicalRecommendations = recommendationsSelected
    ? recommendationResult.recommendations
    : [];
  const canonicalRoadmap = recommendationsSelected
    ? recommendationResult.roadmap
    : {
        first30Days: [],
        next30Days: [],
        final30Days: [],
      };
  const biggestOpportunity =
    recommendationResult.filteredKeywordGaps.length > 0
      ? "Validated non-branded keyword gaps"
      : fallbackBiggestOpportunity;

  const reportStatus = firstText(
    options.reportStatus,
    report?.reportStatus,
    report?.status,
    options.renderReady ? "completed" : "processing_technical"
  );

  const renderReady = options.renderReady ?? report?.renderReady === true;
  const completedAt = options.completedAt !== undefined
    ? options.completedAt
    : readText(report?.completedAt) || null;

  const moduleStatus = {
    ...asRecord(report?.moduleStatus),
    technical: technicalState,
    onPage: technicalState,
    aiSearchVisibility: aiSearchVisibility
      ? "completed"
      : asRecord(report?.moduleStatus)?.aiSearchVisibility || "skipped",
    aiOptimization: aiSearchVisibility
      ? "completed"
      : asRecord(report?.moduleStatus)?.aiOptimization || "skipped",
    aiRecommendations:
      recommendationsSelected
        ? canonicalRecommendations.length > 0
          ? "completed"
          : "partial"
        : "skipped",
  };

  const reconciliation = {
    version: "3.0",
    reconciledAt: new Date().toISOString(),
    renderReady,
    reportStatus,
    technical: {
      state: technicalState,
      final: FINAL_TECHNICAL_STATES.has(technicalState),
      confidence: technicalConfidence(technicalState, pagesCrawled),
      pagesCrawled,
      discoveredPages:
        numberOrNull(onPage?.discoveredPages) ?? pagesCrawled,
      completedPages:
        numberOrNull(onPage?.completedPages) ?? pagesCrawled,
      failedPages: numberOrNull(onPage?.failedPages) ?? 0,
      remainingPages: numberOrNull(onPage?.remainingPages) ?? 0,
      outsideLimitPages: numberOrNull(onPage?.outsideLimitPages) ?? 0,
      coveragePercent: numberOrNull(onPage?.coveragePercent) ?? null,
      pageLimit: numberOrNull(onPage?.pageLimit) || 100,
      limitation:
        firstText(onPage?.limitation) ||
        (["partial", "failed", "timed_out"].includes(technicalState)
          ? `Technical crawl ${technicalState}; metrics are based on ${pagesCrawled} returned page(s).`
          : null),
    },
    sources: {
      seo: canonicalSeo.source,
      technical: "onPage",
      traffic: "traffic.rawMonthly/monthly only",
      domainAnalytics: "provider signal only; excluded from executive traffic",
      ai: "aiSearchVisibility methodology v2 only",
    },
    scoreFormula: {
      seo: 30,
      ux: 15,
      performance: 25,
      backlinks: 15,
      aiVisibility: 15,
      missingComponents: "Available component weights are normalized rather than scored as zero.",
    },
  };

  const unifiedOverview = {
    ...asRecord(report?.unifiedOverview),
    overallScore,
    seoScore,
    uxScore,
    aiVisibilityScore: aiScore,
    biggestIssue,
    biggestOpportunity,
    primaryOpportunity: biggestOpportunity,
    keyMetrics: {
      ...asRecord(report?.unifiedOverview?.keyMetrics),
      pagesCrawled,
      organicTraffic: canonicalTraffic.monthly,
      organicKeywords: canonicalTraffic.keywordCount,
      aiVisibilityScore: aiScore,
    },
  };

  const executiveSummary = {
    biggestIssue,
    biggestOpportunity,
    technicalConfidence: reconciliation.technical.confidence,
    dataLimitations: reconciliation.technical.limitation
      ? [reconciliation.technical.limitation]
      : [],
  };

  const reconciledDataforseo = isRecord(report?.dataforseo)
    ? {
        ...asRecord(report.dataforseo),
        keywordGap: isRecord(report?.dataforseo?.keywordGap)
          ? {
              ...asRecord(report.dataforseo.keywordGap),
              missingKeywords: recommendationResult.filteredKeywordGaps,
              opportunities: recommendationResult.filteredKeywordGaps.slice(0, 10),
              suppressedCompetitorBrandedKeywords:
                recommendationResult.suppressedCompetitorBrandedKeywords,
            }
          : report?.dataforseo?.keywordGap,
      }
    : report?.dataforseo;

  return {
    ...report,
    reportVersion: "3.0",
    reportStatus,
    renderReady,
    completedAt,
    normalizedDomain: normalizeDomain(report?.normalizedDomain || report?.domain || report?.url),
    submittedUrl: firstText(report?.submittedUrl, report?.url),
    resolvedUrl: firstText(report?.resolvedUrl, report?.url),
    canonicalUrl: firstText(report?.canonicalUrl, report?.resolvedUrl, report?.url),
    title: canonicalSeo.title,
    description: canonicalSeo.metaDescription,
    h1: canonicalSeo.h1,
    h1Count: canonicalSeo.h1Count,
    canonicalSeo,
    onPage: {
      ...onPage,
      crawledPages: pagesCrawled,
      pagesCrawled,
      crawlStatus: technicalState,
      confidence: reconciliation.technical.confidence,
      limitation: reconciliation.technical.limitation,
    },
    moduleStatus,
    traffic: {
      ...asRecord(report?.traffic),
      monthly: canonicalTraffic.monthly,
      rawMonthly: canonicalTraffic.monthly,
      daily: canonicalTraffic.daily,
      rankedKeywordCount: canonicalTraffic.keywordCount,
      confidence: canonicalTraffic.confidence,
      method: canonicalTraffic.method,
      source: canonicalTraffic.source,
    },
    dataforseo: reconciledDataforseo,
    keywordGap: isRecord(reconciledDataforseo?.keywordGap)
      ? reconciledDataforseo.keywordGap
      : report?.keywordGap,
    providerSignals: {
      ...asRecord(report?.providerSignals),
      domainAnalytics: report?.domainAnalytics || null,
    },
    aiSearchVisibility,
    aiVisibility: aiSearchVisibility
      ? {
          score: aiScore,
          rawScore: aiScore,
          confidence: firstText(aiSearchVisibility?.confidence, "low"),
          label: "Canonical AI Search Visibility",
          totalMentions: numberOrNull(aiSearchVisibility?.brandMentionCount) || 0,
          totalModels: asArray(aiSearchVisibility?.modelsExpected).length || 3,
          validModelCount: asArray(aiSearchVisibility?.modelsCalled).length,
          shareOfVoice: numberOrNull(aiSearchVisibility?.shareOfVoice) || 0,
          brand: firstText(aiSearchVisibility?.brand),
          industry: firstText(aiSearchVisibility?.industry),
          competitors: asArray(aiSearchVisibility?.topCompetitors),
          pageGeoReadiness: report?.aiVisibility?.pageGeoReadiness || null,
          canonical: true,
        }
      : null,
    aiOptimization: aiCompatibility,
    issues,
    overallScore,
    seoScore,
    uxScore,
    aiScore,
    estimatedTraffic: canonicalTraffic.monthly,
    keywordCount: canonicalTraffic.keywordCount,
    unifiedOverview,
    executiveSummary,
    summary: {
      ...asRecord(report?.summary),
      biggestIssue,
      biggestOpportunity,
    },
    recommendations: canonicalRecommendations,
    actionRoadmap: canonicalRoadmap,
    aiRecommendations: {
      ...asRecord(report?.aiRecommendations),
      recommendations: canonicalRecommendations,
      roadmap: canonicalRoadmap,
      source: recommendationResult.source,
      methodologyVersion: recommendationResult.methodologyVersion,
      businessType: recommendationResult.businessType,
      suppressedCompetitorBrandedKeywords:
        recommendationResult.suppressedCompetitorBrandedKeywords,
    },
    reconciliation,
  };
}
