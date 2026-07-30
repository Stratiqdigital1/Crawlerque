export function normalizeAuditData(report: any) {
  const seoScore = firstNumber([
    report?.seoScore,
    report?.canonicalSeo?.score,
  ]);
  const uxScore = firstNumber([
    report?.uxScore,
    report?.performanceScore,
  ]);
  const overallScore = firstNumber([
    report?.overallScore,
    report?.unifiedOverview?.overallScore,
  ]);

  const mobileScore = firstNumber([
    report?.pageSpeed?.mobile?.score,
    report?.performance?.mobileScore,
    report?.coreWebVitals?.mobileScore,
  ]);

  const desktopScore = firstNumber([
    report?.pageSpeed?.desktop?.score,
    report?.performance?.desktopScore,
    report?.coreWebVitals?.desktopScore,
  ]);

const aiScore = firstNumber([
  report?.aiScore,
  report?.aiSearchVisibility?.overallScore,
]);

// Canonical executive traffic comes only from Traffic Intelligence. Domain
// Analytics is a separately labelled provider signal and must not silently
// replace this figure.
const traffic = firstNumber([
  report?.estimatedTraffic,
  report?.traffic?.rawMonthly,
  report?.traffic?.monthly,
]);

const keywordCount = firstNumber([
  report?.keywordCount,
  report?.traffic?.rankedKeywordCount,
  report?.traffic?.keywordCount,
  report?.dataforseo?.rankedKeywordCount,
  report?.dataforseo?.totalRankedKeywordsFetched,
]);

  const title =
    report?.canonicalSeo?.title ||
    report?.title ||
    report?.seoChecks?.title ||
    report?.metadata?.title ||
    null;

  const metaDescription =
    report?.canonicalSeo?.metaDescription ||
    report?.description ||
    report?.seoChecks?.metaDescription ||
    report?.metaDescription ||
    report?.metadata?.description ||
    null;

  const h1 =
    report?.canonicalSeo?.h1 ||
    report?.h1 ||
    report?.seoChecks?.h1 ||
    report?.content?.h1 ||
    null;

  const missingAlt = firstNumber([
    report?.canonicalSeo?.imagesMissingAlt,
    report?.seoChecks?.missingAlt,
    report?.missingAltCount,
    report?.images?.missingAlt,
  ]);

  const competitors =
    asArray(report?.competitors)
      .concat(asArray(report?.domainAnalytics?.competitors))
      .concat(asArray(report?.seoLabs?.competitors))
      .filter(Boolean);

  const keywordGaps =
    asArray(report?.keywordGaps)
      .concat(asArray(report?.keywordGap?.missingKeywords))
      .concat(asArray(report?.dataforseo?.keywordGap?.missingKeywords))
      .concat(asArray(report?.seoLabs?.keywordGaps))
      .concat(asArray(report?.keywords?.gaps))
      .filter(Boolean);

  const issues =
    asArray(report?.issues)
      .concat(asArray(report?.topIssues))
      .filter(Boolean);

  const recommendationMap = new Map<string, any>();

  asArray(report?.recommendations)
    .concat(asArray(report?.aiRecommendations?.recommendations))
    .concat(asArray(report?.actionPlan))
    .map(formatRecommendation)
    .filter(Boolean)
    .forEach((recommendation: any) => {
      const key = String(recommendation?.id || recommendation?.title || "")
        .toLowerCase()
        .trim();
      if (key && !recommendationMap.has(key)) {
        recommendationMap.set(key, recommendation);
      }
    });

  const recommendations = Array.from(recommendationMap.values());

  return {
    domain: report?.domain || report?.url || "Website",

    scores: {
      overall: overallScore,
      seo: seoScore,
      ux: uxScore,
      mobile: mobileScore,
      desktop: desktopScore,
      ai: aiScore,
    },

    seo: {
      title,
      metaDescription,
      h1,
      missingAlt,
    },

technicalCrawl: getTechnicalCrawl(report),


    performance: {
      mobileScore,
      desktopScore,
      lcp:
        report?.pageSpeed?.mobile?.lcp ||
        report?.coreWebVitals?.lcp ||
        report?.performance?.lcp ||
        null,
      cls:
        report?.pageSpeed?.mobile?.cls ||
        report?.coreWebVitals?.cls ||
        report?.performance?.cls ||
        null,
      tbt:
        report?.pageSpeed?.mobile?.tbt ||
        report?.coreWebVitals?.tbt ||
        report?.performance?.tbt ||
        null,
    },

    traffic: {
      monthly: traffic,
      daily: traffic === null ? null : Math.round(traffic / 30),
      keywordCount,
      confidence:
        report?.traffic?.confidence ||
        "insufficient-data",
      providerSignal:
        report?.providerSignals?.domainAnalytics ||
        report?.domainAnalytics ||
        null,
    },

ai: {
  score: aiScore,
  confidence:
    report?.aiSearchVisibility?.confidence ||
    report?.aiVisibility?.confidence ||
    "low",
  brandMentions: firstNumber([
    report?.aiSearchVisibility?.brandMentionCount,
    report?.aiVisibility?.totalMentions,
  ]),
  modelCoverage:
    Array.isArray(report?.aiSearchVisibility?.modelsCalled)
      ? report.aiSearchVisibility.modelsCalled.length
      : null,
  shareOfVoice: firstNumber([
    report?.aiSearchVisibility?.shareOfVoice,
    report?.aiVisibility?.shareOfVoice,
  ]),
  prompts: getAiPromptResults(report),
  pageInsights: getAiPageInsights(report),
},

    backlinks: {
  rank:
    report?.backlinks?.rank ||
    report?.backlinkRank ||
    report?.authority?.rank ||
    null,
  total:
    report?.backlinks?.totalBacklinks ||
    report?.backlinks?.backlinks ||
    null,
  referringDomains:
    report?.backlinks?.referringDomains ||
    report?.authority?.referringDomains ||
    null,
  samples: getBacklinkSamples(report),
},

    competitors: dedupeByDomain(competitors).map(formatCompetitor),
    keywordGaps: keywordGaps.map(formatKeywordGap),
topKeywords: getTopKeywords(report),
topPages: getTopPages(report),
issues,
recommendations,
actionRoadmap:
  report?.actionRoadmap ||
  report?.aiRecommendations?.roadmap ||
  null,

moduleStatus: getModuleStatus(report),
dataQuality: getDataQuality({
  traffic,
  keywordCount,
  competitors,
  keywordGaps,
  aiScore,
  aiConfidence:
    report?.aiSearchVisibility?.confidence ||
    report?.aiVisibility?.confidence ||
    "low",
}),

executiveCards: buildExecutiveCards({
  overallScore,
  seoScore,
  uxScore,
  aiScore,
  traffic,
  keywordCount,
}),

    summary: {
      biggestIssue:
        report?.executiveSummary?.biggestIssue ||
        report?.unifiedOverview?.biggestIssue ||
        issues?.[0]?.title ||
        issues?.[0]?.issue ||
        "No major issue was detected from the available data.",

      biggestOpportunity:
        report?.executiveSummary?.biggestOpportunity ||
        report?.unifiedOverview?.biggestOpportunity ||
        report?.unifiedOverview?.primaryOpportunity ||
        "Improve SEO foundations, performance, authority, and AI visibility.",
    },
  };
}

export function buildSmartRecommendations(normalized: any) {
  const recommendations: any[] = [];

  const seoScore = normalized?.scores?.seo;
  const mobileScore = normalized?.scores?.mobile;
  const aiScore = normalized?.scores?.ai;
  const traffic = normalized?.traffic?.monthly;
  const keywordCount = normalized?.traffic?.keywordCount;
  const technicalConfidence = String(
    normalized?.technicalCrawl?.confidence || "unknown"
  ).toLowerCase();

  const add = (recommendation: any) => {
    recommendations.push({
      owner: recommendation.owner || "Growth Team",
      evidence: recommendation.evidence || [],
      validationStatus: recommendation.validationStatus || "reconciled",
      ...recommendation,
    });
  };

  if (seoScore !== null && seoScore < 80) {
    add({
      title: "Improve SEO foundation score",
      impact: "High",
      timeline: "0–30 days",
      owner: "SEO",
      detail:
        "The reconciled SEO score is below 80. Improve the resolved homepage title, meta description, heading structure, internal linking, and page relevance.",
      evidence: [
        normalized?.seo?.title ? `Title: ${normalized.seo.title}` : "Resolved homepage title is missing",
        normalized?.seo?.metaDescription ? "Meta description detected" : "Resolved homepage meta description is missing",
      ],
    });
  }

  if (!normalized?.seo?.metaDescription) {
    add({
      title: "Add a meta description to the resolved homepage",
      impact: "Medium",
      timeline: "0–14 days",
      owner: "SEO / Content",
      detail:
        "The final resolved homepage does not expose a usable meta description. Add a unique 140–160 character description.",
      evidence: [normalized?.seo?.title || "Resolved homepage"],
    });
  }

  if (Number(normalized?.seo?.missingAlt || 0) > 0) {
    add({
      title: "Fix missing image ALT text",
      impact: "Medium",
      timeline: "0–14 days",
      owner: "Content / Development",
      detail:
        "Important images are missing ALT text, which weakens accessibility and image-search signals.",
      evidence: [`Missing ALT count: ${Number(normalized.seo.missingAlt)}`],
    });
  }

  if (mobileScore !== null && mobileScore < 75) {
    add({
      title: "Improve mobile performance",
      impact: "High",
      timeline: "0–30 days",
      owner: "Development",
      detail:
        "Mobile performance is below 75. Reduce heavy scripts, optimize images, improve caching, and address Core Web Vitals.",
      evidence: [`Mobile PageSpeed score: ${mobileScore}/100`],
    });
  }

  if (normalized?.performance?.lcp) {
    const lcpNumber = parseFloat(String(normalized.performance.lcp));

    if (Number.isFinite(lcpNumber) && lcpNumber > 2.5) {
      add({
        title: "Reduce Largest Contentful Paint",
        impact: "High",
        timeline: "0–30 days",
        owner: "Development",
        detail:
          "LCP is above the 2.5 second target. Optimize the largest above-the-fold element and its delivery path.",
        evidence: [`Mobile LCP: ${normalized.performance.lcp}`],
      });
    }
  }

  if (aiScore !== null && aiScore < 70) {
    add({
      title: "Strengthen unbranded AI search visibility",
      impact: "High",
      timeline: "30–60 days",
      owner: "SEO / Content / PR",
      detail:
        "The canonical AI visibility score is below 70 across unbranded category prompts. Improve entity clarity, topical authority, citations, and structured content.",
      evidence: [
        `AI visibility score: ${aiScore}/100`,
        `Confidence: ${normalized?.ai?.confidence || "low"}`,
      ],
    });
  }

  if (traffic === null || traffic <= 0) {
    add({
      title: "Build measurable organic visibility",
      impact: "High",
      timeline: "30–90 days",
      owner: "SEO / Content",
      detail:
        "Canonical modeled organic traffic is weak or unavailable. Expand relevant non-branded keyword coverage and improve indexing.",
      evidence: [`Traffic confidence: ${normalized?.traffic?.confidence || "insufficient-data"}`],
    });
  }

  if (keywordCount !== null && keywordCount < 500) {
    add({
      title: "Expand the non-branded keyword footprint",
      impact: "Medium",
      timeline: "30–60 days",
      owner: "SEO / Content",
      detail:
        "The ranking footprint is below 500 keywords. Build supporting pages around validated category and commercial demand.",
      evidence: [`Ranked keywords: ${keywordCount}`],
    });
  }

  normalized?.issues?.slice(0, 5).forEach((issue: any) => {
    const issueTitle = issue?.title || issue?.issue || "Resolve priority audit issue";
    const looksTechnical = /(crawl|broken link|duplicate|status code|redirect)/i.test(issueTitle);

    if (
      looksTechnical &&
      ["unavailable", "processing", "not-selected"].includes(technicalConfidence)
    ) {
      return;
    }

    add({
      title: issueTitle,
      impact: issue?.severity || issue?.impact || "Medium",
      timeline: issue?.timeline || "0–30 days",
      owner: looksTechnical ? "Development" : "SEO / Content",
      detail:
        issue?.description ||
        issue?.impact ||
        issue?.fix ||
        issue?.recommendation ||
        "Review and resolve this reconciled audit issue.",
      evidence: [
        issue?.affectedUrl ||
          issue?.url ||
          normalized?.seo?.title ||
          "Reconciled audit evidence",
      ],
    });
  });

  const deduped = new Map<string, any>();
  recommendations.forEach((recommendation) => {
    const key = String(recommendation.title || "").toLowerCase().trim();
    if (key && !deduped.has(key)) deduped.set(key, recommendation);
  });

  return Array.from(deduped.values()).slice(0, 10);
}

function formatRecommendation(item: any) {
  if (!item) return null;

  if (typeof item === "string") {
    const detail = item.trim();
    if (!detail) return null;

    return {
      id: detail.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80),
      title: detail.split(".")[0] || "Recommendation",
      detail,
      sourceModule: "Recommendations",
      impact: "Medium",
      effort: "Medium",
      owner: "Growth Team",
      timeline: "31–60 days",
      expectedImpact: "Improve the audited website based on available evidence.",
      affectedUrls: [],
      evidence: [],
      validationStatus: "directional",
      confidence: "directional",
    };
  }

  return {
    id:
      item?.id ||
      String(item?.title || item?.detail || "recommendation")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 80),
    title:
      item?.title ||
      item?.issue ||
      String(item?.detail || item?.recommendation || "Recommendation").split(".")[0],
    detail:
      item?.detail ||
      item?.description ||
      item?.recommendation ||
      "Review this recommendation against the attached evidence.",
    sourceModule: item?.sourceModule || item?.source || "Recommendations",
    impact: item?.impact || "Medium",
    effort: item?.effort || item?.difficulty || "Medium",
    owner: item?.owner || "Growth Team",
    timeline: item?.timeline || "31–60 days",
    expectedImpact: item?.expectedImpact || item?.outcome || "Improve website growth performance.",
    affectedUrls: asArray(item?.affectedUrls).filter(Boolean),
    evidence: asArray(item?.evidence).filter(Boolean),
    validationStatus: item?.validationStatus || "directional",
    confidence: item?.confidence || "directional",
    keyword: item?.keyword || null,
    recommendedPageType: item?.recommendedPageType || null,
  };
}

function firstNumber(values: any[]) {
  for (const value of values) {
    const n = toNumber(value);
    if (n !== null) return n;
  }

  return null;
}

function toNumber(value: any) {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function asArray(value: any) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "object") return Object.values(value);

  return [];
}

function dedupeByDomain(items: any[]) {
  const seen = new Set<string>();
  const output: any[] = [];

  items.forEach((item) => {
    const domain = item?.domain || item?.competitor || item?.url;

    if (!domain) return;

    const key = String(domain).toLowerCase();

    if (seen.has(key)) return;

    seen.add(key);
    output.push(item);
  });

  return output;
}
function formatKeywordGap(item: any) {
  return {
    title:
      item?.keyword ||
      item?.query ||
      item?.title ||
      item?.name ||
      "Keyword opportunity",

    impact:
      item?.impact ||
      item?.intent ||
      item?.opportunityLevel ||
      "Medium",

    timeline:
      item?.timeline ||
      "30–60 days",

    detail:
      item?.detail ||
      item?.recommendation ||
      item?.action ||
      item?.reason ||
      `Create or improve content for this keyword opportunity. Search volume: ${
        item?.searchVolume || item?.volume || "not available"
      }. Current position: ${item?.position || "not ranking"}.`,
  };
}
function getTopKeywords(report: any) {
  const keywords =
    asArray(report?.traffic?.keywords)
      .concat(asArray(report?.topKeywords))
      .concat(asArray(report?.domainAnalytics?.topKeywords))
      .concat(asArray(report?.keywords?.topKeywords))
      .filter(Boolean);

  return keywords.slice(0, 15).map((item: any) => ({
    keyword: item?.keyword || item?.query || item?.name || "Keyword",
    position: item?.position || item?.rank || item?.rank_group || "N/A",
    volume: item?.volume || item?.searchVolume || item?.search_volume || "N/A",
    traffic:
      item?.estimatedVisits ||
      item?.traffic ||
      item?.clickstream_etv ||
      item?.etv ||
      "N/A",
  }));
}

function getBacklinkSamples(report: any) {
  const links =
    asArray(report?.backlinks?.items)
      .concat(asArray(report?.backlinks?.samples))
      .concat(asArray(report?.backlinks?.topBacklinks))
      .concat(asArray(report?.authority?.topBacklinks))
      .filter(Boolean);

  return links.slice(0, 10).map((item: any) => ({
    source:
      item?.url_from ||
      item?.source ||
      item?.sourceUrl ||
      item?.from ||
      "Source not available",
    target:
      item?.url_to ||
      item?.target ||
      item?.targetUrl ||
      item?.to ||
      "Target not available",
    anchor:
      item?.anchor ||
      item?.anchorText ||
      "Anchor not available",
  }));
}

function getAiPromptResults(report: any) {
  const promptRows = asArray(report?.aiSearchVisibility?.promptResults);

  const output: any[] = [];

  promptRows.forEach((row: any) => {
    const models = row?.models && typeof row.models === "object"
      ? Object.entries(row.models)
      : [];

    models.forEach(([model, rawResult]: [string, any]) => {
      const result = rawResult || {};
      output.push({
        prompt: row?.prompt || "AI visibility prompt",
        model,
        result:
          result?.snippet ||
          (result?.available === false ? "Model response unavailable" : "No brand mention detected"),
        mentioned: result?.mentioned === true ? "Mentioned" : "Not mentioned",
        position: result?.position ?? null,
        sentiment: result?.sentiment ?? null,
        scored: row?.scored !== false,
      });
    });
  });

  return output.slice(0, 15);
}

function getAiPageInsights(report: any) {
  const rankedPages = asArray(report?.aiSearchVisibility?.rankedPages);
  const citations = asArray(report?.aiSearchVisibility?.citations);

  if (!rankedPages.length && !citations.length) return null;

  const formatPage = (page: any) => ({
    url: page?.url || page?.path || "URL not available",
    title: page?.title || page?.path || page?.url || "Untitled page",
    score: page?.score ?? null,
    grade: page?.grade || null,
    topIssue: page?.topIssue || null,
  });

  return {
    totalPagesAnalyzed: rankedPages.length,
    topPerformingPages: rankedPages.slice(0, 5).map(formatPage),
    pagesNeedingOptimization: [],
    citedPages: citations.slice(0, 10).map((citation: any) => ({
      url: citation?.url || "URL not available",
      models: asArray(citation?.models),
    })),
    likelySourcePages: [],
  };
}

function getTechnicalCrawl(report: any) {
  const pages =
    asArray(report?.onPage?.pages)
      .concat(asArray(report?.technicalAudit?.pages))
      .concat(asArray(report?.crawl?.pages))
      .concat(asArray(report?.onPage?.items))
      .filter(Boolean);

  const issues =
    asArray(report?.onPage?.issues)
      .concat(asArray(report?.technicalAudit?.issues))
      .concat(asArray(report?.crawl?.issues))
      .filter(Boolean);

  const pagesCrawled = firstNumber([
    report?.onPage?.crawledPages,
    report?.onPage?.pagesCrawled,
    report?.technicalAudit?.pagesCrawled,
    report?.crawl?.pagesCrawled,
    pages.length,
  ]);

  return {
    status:
      report?.onPage?.crawlStatus ||
      report?.moduleStatus?.technical ||
      report?.technicalAudit?.status ||
      report?.crawl?.status ||
      "Data not available",

    confidence:
      report?.onPage?.confidence ||
      report?.reconciliation?.technical?.confidence ||
      "unknown",

    limitation:
      report?.onPage?.limitation ||
      report?.reconciliation?.technical?.limitation ||
      null,

    pagesCrawled,
    discoveredPages: firstNumber([
      report?.onPage?.discoveredPages,
      report?.reconciliation?.technical?.discoveredPages,
      pagesCrawled,
    ]),
    completedPages: firstNumber([
      report?.onPage?.completedPages,
      report?.reconciliation?.technical?.completedPages,
      pagesCrawled,
    ]),
    failedPages: firstNumber([
      report?.onPage?.failedPages,
      report?.reconciliation?.technical?.failedPages,
      0,
    ]),
    remainingPages: firstNumber([
      report?.onPage?.remainingPages,
      report?.reconciliation?.technical?.remainingPages,
      0,
    ]),
    outsideLimitPages: firstNumber([
      report?.onPage?.outsideLimitPages,
      report?.reconciliation?.technical?.outsideLimitPages,
      0,
    ]),
    pageLimit: firstNumber([
      report?.onPage?.pageLimit,
      report?.reconciliation?.technical?.pageLimit,
      100,
    ]),
    coveragePercent: firstNumber([
      report?.onPage?.coveragePercent,
      report?.reconciliation?.technical?.coveragePercent,
    ]),
    isPartial:
      report?.onPage?.isPartial === true ||
      ["partial", "failed", "timed_out"].includes(
        String(
          report?.onPage?.crawlStatus ||
            report?.moduleStatus?.technical ||
            ""
        ).toLowerCase()
      ),

    issuesFound: firstNumber([
      report?.onPage?.issuesFound,
      report?.technicalAudit?.issuesFound,
      report?.crawl?.issuesFound,
      issues.length,
    ]),

    pages: pages.slice(0, 10).map((page: any) => ({
      url: page?.url || page?.page || page?.target || "URL not available",
      statusCode:
        page?.statusCode ||
        page?.status_code ||
        page?.httpStatus ||
        "N/A",
      title:
        page?.title ||
        page?.meta?.title ||
        "Title not available",
      issue:
        page?.issue ||
        page?.mainIssue ||
        page?.warning ||
        "No major issue listed",
    })),

    issues: issues.slice(0, 10).map((issue: any) => ({
      title:
        issue?.title ||
        issue?.issue ||
        issue?.name ||
        "Technical issue",
      severity:
        issue?.severity ||
        issue?.impact ||
        "Medium",
      detail:
        issue?.detail ||
        issue?.description ||
        issue?.recommendation ||
        "Review this technical issue and prioritize it based on SEO and UX impact.",
    })),
  };
}

function getTopPages(report: any) {
  const pages =
    asArray(report?.topPages)
      .concat(asArray(report?.traffic?.topPages))
      .concat(asArray(report?.domainAnalytics?.topPages))
      .concat(asArray(report?.seoPages))
      .filter(Boolean);

  return pages.slice(0, 12).map((page: any) => ({
    url:
      page?.url ||
      page?.page ||
      page?.path ||
      "Page not available",

    traffic:
      page?.traffic ||
      page?.estimatedVisits ||
      page?.clickstream_etv ||
      "N/A",

    keywords:
      page?.keywords ||
      page?.keywordCount ||
      page?.rankingKeywords ||
      "N/A",

    title:
      page?.title ||
      page?.metaTitle ||
      "Title not available",
  }));
}

function formatCompetitor(item: any) {
  return {
    domain:
      item?.domain ||
      item?.competitor ||
      item?.url ||
      "Competitor",

    sharedKeywords:
      item?.sharedKeywords ||
      item?.intersections ||
      item?.keywords ||
      item?.keywordCount ||
      "N/A",

    traffic:
      item?.traffic ||
      item?.estimatedTraffic ||
      item?.organicTraffic ||
      item?.etv ||
      "N/A",

    threatScore:
      item?.threatScore ||
      item?.score ||
      item?.riskScore ||
      "N/A",

    winningFactor:
      item?.likelyWinningFactor ||
      item?.winningFactor ||
      item?.reason ||
      item?.advantage ||
      "Focused content coverage",
  };
}

function getModuleStatus(report: any) {
  const status = report?.moduleStatus || {};

  return [
    {
      module: "SEO Foundation",
      status: status?.seo || "completed",
      detail: "Resolved homepage title, metadata, headings, ALT text, and SEO basics.",
    },
    {
      module: "Technical / PageSpeed",
      status: status?.technical || status?.onPage || status?.pagespeed || "skipped",
      detail: "PageSpeed plus final OnPage crawl state and coverage.",
    },
    {
      module: "Traffic Intelligence",
      status: status?.traffic || status?.dataforseo || "not_available",
      detail: "Canonical modeled organic traffic and ranked keyword footprint.",
    },
    {
      module: "Keyword Intelligence",
      status: status?.keywords || status?.keywordResearch || "not_available",
      detail: "Ranking keywords, non-branded gaps, and content opportunities.",
    },
    {
      module: "Competitor Intelligence",
      status: status?.competitors || status?.dataforseo || "not_available",
      detail: "Commercial competitors, shared keywords, and threat signals.",
    },
    {
      module: "Backlink Authority",
      status: status?.backlinks || status?.dataforseo || "not_available",
      detail: "Referring domains, backlinks, and authority signals.",
    },
    {
      module: "AI Visibility",
      status: status?.aiSearchVisibility || status?.ai || "not_available",
      detail: "Unbranded category prompts across ChatGPT, Claude, and Gemini.",
    },
    {
      module: "Recommendations",
      status:
        Array.isArray(report?.recommendations) && report.recommendations.length > 0
          ? "completed"
          : status?.aiRecommendations || "not_available",
      detail: "Prioritized actions generated from reconciled audit evidence.",
    },
  ];
}

function buildExecutiveCards(data: any) {
  const cards: any[] = [];

  if (data.seoScore !== null) {
    cards.push(
      data.seoScore >= 85
        ? {
            title: "Strong SEO Foundation",
            impact: "Positive",
            detail: "The resolved homepage has a strong foundational SEO score.",
          }
        : {
            title: "SEO Foundation Needs Improvement",
            impact: "High",
            detail: "The reconciled title, metadata, headings, and image signals need improvement.",
          }
    );
  }

  if (data.uxScore !== null && data.uxScore < 75) {
    cards.push({
      title: "Performance Risk Detected",
      impact: "High",
      detail: "Performance and Core Web Vitals may be affecting user experience and conversion efficiency.",
    });
  }

  if (data.aiScore !== null) {
    cards.push(
      data.aiScore >= 70
        ? {
            title: "AI Visibility Strength",
            impact: "Positive",
            detail: "The brand has measurable visibility across unbranded category prompts.",
          }
        : {
            title: "Low AI Discoverability",
            impact: "High",
            detail: "The brand is weak or absent across unbranded category prompts in the tested AI models.",
          }
    );
  }

  if (data.keywordCount !== null && data.keywordCount < 500) {
    cards.push({
      title: "Keyword Coverage Gap",
      impact: "Medium",
      detail: "The website has a limited ranking keyword footprint compared with stronger sites.",
    });
  }

  if (data.traffic === null || data.traffic <= 0) {
    cards.push({
      title: "Low Organic Visibility",
      impact: "High",
      detail: "Canonical modeled organic traffic is weak or unavailable.",
    });
  }

  return cards.slice(0, 6);
}

function getDataQuality(data: any) {
  return [
    {
      area: "Traffic Estimate",
      confidence:
        data.traffic && data.keywordCount >= 500
          ? "High"
          : data.traffic
            ? "Moderate"
            : "Low",
      note:
        "Traffic estimates are modeled from available ranking and keyword signals, not direct analytics data.",
    },
    {
      area: "Keyword Intelligence",
      confidence:
        data.keywordCount >= 2000
          ? "High"
          : data.keywordCount >= 500
            ? "Moderate"
            : "Low",
      note:
        "Keyword confidence improves when a larger ranking footprint is available.",
    },
    {
      area: "Competitor Intelligence",
      confidence:
        Array.isArray(data.competitors) && data.competitors.length >= 5
          ? "Moderate"
          : "Low",
      note:
        "Competitor intelligence depends on overlap and available ranking data.",
    },
    {
      area: "Keyword Gaps",
      confidence:
        Array.isArray(data.keywordGaps) && data.keywordGaps.length >= 5
          ? "Moderate"
          : "Low",
      note:
        "Keyword gaps should be validated against business relevance before execution.",
    },
    {
      area: "AI Visibility",
      confidence:
        data.aiScore === null
          ? "Unavailable"
          : String(data.aiConfidence || "low").toLowerCase() === "high"
            ? "High"
            : String(data.aiConfidence || "low").toLowerCase() === "moderate"
              ? "Moderate"
              : "Low",
      note:
        "AI visibility uses unbranded category prompts across the canonical ChatGPT, Claude, and Gemini roster.",
    },
  ];
}