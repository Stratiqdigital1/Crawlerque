export function normalizeAuditData(report: any) {
  const seoScore = toNumber(report?.seoScore);
  const uxScore = toNumber(report?.uxScore || report?.performanceScore);
  const overallScore = toNumber(report?.overallScore);

  const mobileScore =
    toNumber(report?.pageSpeed?.mobile?.score) ||
    toNumber(report?.performance?.mobileScore) ||
    toNumber(report?.coreWebVitals?.mobileScore);

  const desktopScore =
    toNumber(report?.pageSpeed?.desktop?.score) ||
    toNumber(report?.performance?.desktopScore) ||
    toNumber(report?.coreWebVitals?.desktopScore);

  const aiScore =
    toNumber(report?.aiVisibility?.score) ||
    toNumber(report?.aiOptimization?.visibilityScore);

const traffic =
  firstNumber([
    report?.traffic?.rawMonthly,
    report?.traffic?.monthly,
    report?.domainAnalytics?.organicTraffic,
    report?.domainAnalytics?.organicTrafficMonthly,
    report?.organicTraffic,
  ]);

const keywordCount =
  firstNumber([
    report?.traffic?.rankedKeywordCount,
    report?.traffic?.keywordCount,
    report?.domainAnalytics?.organicKeywords,
    report?.keywords?.count,
    report?.topKeywords?.length,
  ]);

  const title =
    report?.seoChecks?.title ||
    report?.title ||
    report?.metadata?.title ||
    null;

  const metaDescription =
    report?.seoChecks?.metaDescription ||
    report?.metaDescription ||
    report?.metadata?.description ||
    null;

  const h1 =
    report?.seoChecks?.h1 ||
    report?.h1 ||
    report?.h1Count ||
    report?.content?.h1 ||
    null;

  const missingAlt =
    report?.seoChecks?.missingAlt ||
    report?.missingAltCount ||
    report?.images?.missingAlt ||
    null;

  const competitors =
    asArray(report?.competitors)
      .concat(asArray(report?.domainAnalytics?.competitors))
      .concat(asArray(report?.seoLabs?.competitors))
      .filter(Boolean);

  const keywordGaps =
    asArray(report?.keywordGaps)
      .concat(asArray(report?.keywordGap))
      .concat(asArray(report?.seoLabs?.keywordGaps))
      .concat(asArray(report?.keywords?.gaps))
      .filter(Boolean);

  const issues =
    asArray(report?.issues)
      .concat(asArray(report?.topIssues))
      .filter(Boolean);

  const recommendations =
    asArray(report?.recommendations)
      .concat(asArray(report?.aiRecommendations?.recommendations))
      .concat(asArray(report?.actionPlan))
      .filter(Boolean);

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
      daily: traffic ? Math.round(traffic / 30) : null,
      keywordCount,
      confidence:
        report?.traffic?.confidence ||
        report?.domainAnalytics?.confidence ||
        "insufficient-data",
    },

ai: {
  score: aiScore,
  brandMentions:
    report?.aiVisibility?.brandMentions ||
    report?.aiOptimization?.brandMentions ||
    null,
  modelCoverage:
    report?.aiVisibility?.validModelCount ||
    report?.aiOptimization?.validModelCount ||
    null,
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

moduleStatus: getModuleStatus(report),
dataQuality: getDataQuality({
  traffic,
  keywordCount,
  competitors,
  keywordGaps,
  aiScore,
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

  if (seoScore !== null && seoScore < 80) {
    recommendations.push({
      title: "Improve SEO foundation score",
      impact: "High",
      timeline: "0–30 days",
      detail:
        "SEO score is below the recommended 80+ benchmark. Improve title tags, meta descriptions, heading structure, internal linking, and page-level relevance.",
    });
  }

  if (!normalized?.seo?.metaDescription) {
    recommendations.push({
      title: "Add or improve meta descriptions",
      impact: "Medium",
      timeline: "0–14 days",
      detail:
        "Important pages should have unique meta descriptions around 140–160 characters to improve search snippet quality and click-through rate.",
    });
  }

  if (normalized?.seo?.missingAlt && Number(normalized.seo.missingAlt) > 0) {
    recommendations.push({
      title: "Fix missing image ALT text",
      impact: "Medium",
      timeline: "0–14 days",
      detail:
        "Images without ALT text weaken accessibility and image SEO signals. Add descriptive ALT text to important visual assets.",
    });
  }

  if (mobileScore !== null && mobileScore < 75) {
    recommendations.push({
      title: "Improve mobile performance",
      impact: "High",
      timeline: "0–30 days",
      detail:
        "Mobile performance is below the recommended 75+ benchmark. Reduce heavy scripts, optimize images, improve caching, and address Core Web Vitals issues.",
    });
  }

  if (normalized?.performance?.lcp) {
    const lcpNumber = parseFloat(String(normalized.performance.lcp));

    if (Number.isFinite(lcpNumber) && lcpNumber > 2.5) {
      recommendations.push({
        title: "Reduce Largest Contentful Paint",
        impact: "High",
        timeline: "0–30 days",
        detail:
          "LCP should generally be under 2.5 seconds. A slow LCP means the main page content loads too slowly, which can hurt user experience and SEO.",
      });
    }
  }

  if (aiScore === null || aiScore < 70) {
    recommendations.push({
      title: "Strengthen AI search visibility",
      impact: "High",
      timeline: "30–60 days",
      detail:
        "AI visibility should ideally be 70+ for strong answer-engine readiness. Improve entity clarity, topical authority, authoritativeness, FAQs, and structured content.",
    });
  }

  if (!traffic || traffic <= 0) {
    recommendations.push({
      title: "Build measurable organic visibility",
      impact: "High",
      timeline: "30–90 days",
      detail:
        "Organic traffic data is weak or unavailable. Build pages around commercial keyword gaps, improve indexing, and strengthen topical coverage.",
    });
  }

  if (!keywordCount || keywordCount < 500) {
    recommendations.push({
      title: "Expand keyword footprint",
      impact: "Medium",
      timeline: "30–60 days",
      detail:
        "A stronger keyword footprint usually creates more organic growth surface area. Build supporting content and optimize service/product pages around relevant search demand.",
    });
  }

  normalized?.issues?.slice(0, 3).forEach((issue: any) => {
    recommendations.push({
      title: issue?.title || issue?.issue || "Resolve priority audit issue",
      impact: issue?.impact || "Medium",
      timeline: issue?.timeline || "0–30 days",
      detail:
        issue?.description ||
        issue?.recommendation ||
        "This issue should be reviewed and fixed based on business impact.",
    });
  });

  return recommendations.slice(0, 10);
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
  const prompts =
    asArray(report?.aiVisibility?.prompts)
      .concat(asArray(report?.aiVisibility?.results))
      .concat(asArray(report?.aiOptimization?.prompts))
      .concat(asArray(report?.aiOptimization?.results))
      .filter(Boolean);

  return prompts.slice(0, 8).map((item: any) => ({
    prompt:
      item?.prompt ||
      item?.query ||
      item?.question ||
      "AI visibility prompt",

    result:
      item?.result ||
      item?.answer ||
      item?.response ||
      item?.summary ||
      "Result not available",

    mentioned:
      item?.mentioned === true ||
      item?.brandMentioned === true ||
      item?.brand_mentioned === true
        ? "Mentioned"
        : "Not mentioned",
  }));
}

function getAiPageInsights(report: any) {
  const insights = report?.aiOptimization?.pageInsights;
  if (!insights) return null;

  const formatPage = (p: any) => ({
    url: p?.url || "URL not available",
    title: p?.title || p?.url || "Untitled page",
    score: p?.score ?? null,
    grade: p?.grade || "Needs Work",
    topIssue: p?.topIssue || null,
  });

  // "Likely source (inferred)" guesses, one per AI model that mentioned the brand
  const sourceSuggestions = asArray(report?.aiOptimization?.models)
    .filter((m: any) => m?.mentioned && m?.likelySourcePage)
    .map((m: any) => ({
      model: m?.model || "AI model",
      url: m.likelySourcePage?.url,
      title: m.likelySourcePage?.title,
      overlap: m.likelySourcePage?.overlap,
    }));

  return {
    totalPagesAnalyzed: insights.totalPagesAnalyzed ?? 0,
    topPerformingPages: asArray(insights.topPerformingPages).slice(0, 5).map(formatPage),
    pagesNeedingOptimization: asArray(insights.pagesNeedingOptimization).slice(0, 5).map(formatPage),
    likelySourcePages: sourceSuggestions, // label as "inferred" wherever rendered
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

  return {
    status:
      report?.onPage?.status ||
      report?.technicalAudit?.status ||
      report?.crawl?.status ||
      "Data not available",

    pagesCrawled:
      report?.onPage?.pagesCrawled ||
      report?.technicalAudit?.pagesCrawled ||
      report?.crawl?.pagesCrawled ||
      pages.length ||
      null,

    issuesFound:
      report?.onPage?.issuesFound ||
      report?.technicalAudit?.issuesFound ||
      report?.crawl?.issuesFound ||
      issues.length ||
      null,

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
      detail: "Title, metadata, headings, image ALT, and SEO basics.",
    },
    {
      module: "Technical / PageSpeed",
      status: status?.pagespeed || status?.technical || "completed",
      detail: "Mobile, desktop, Core Web Vitals, and technical health.",
    },
    {
      module: "Traffic Intelligence",
      status: status?.dataforseo || status?.traffic || "not_available",
      detail: "Estimated organic visibility, traffic signal, and keyword footprint.",
    },
    {
      module: "Keyword Intelligence",
      status: status?.keywords || status?.keywordResearch || "not_available",
      detail: "Ranking keywords, keyword gaps, and content opportunities.",
    },
    {
      module: "Competitor Intelligence",
      status: status?.competitors || "not_available",
      detail: "Organic competitors, shared keywords, and threat signals.",
    },
    {
      module: "Backlink Authority",
      status: status?.backlinks || "not_available",
      detail: "Referring domains, backlinks, and authority signals.",
    },
    {
      module: "AI Visibility",
      status: status?.aiOptimization || status?.ai || "not_available",
      detail: "AI search visibility, brand mentions, and GEO readiness.",
    },
    {
      module: "Recommendations",
      status: report?.recommendations || report?.aiRecommendations ? "completed" : "not_available",
      detail: "Prioritized growth recommendations and action plan.",
    },
  ];
}

function buildExecutiveCards(data: any) {
  const cards = [];

  if (data.seoScore >= 85) {
    cards.push({
      title: "Strong SEO Foundation",
      impact: "Positive",
      detail:
        "The website has a strong SEO structure and is positioned above many average websites in foundational optimization.",
    });
  } else {
    cards.push({
      title: "SEO Foundation Needs Improvement",
      impact: "High",
      detail:
        "Core SEO elements should be improved to compete more effectively in organic search.",
    });
  }

  if (data.uxScore < 75) {
    cards.push({
      title: "Performance Risk Detected",
      impact: "High",
      detail:
        "Performance and Core Web Vitals may be affecting user experience, rankings, and conversion efficiency.",
    });
  }

  if (data.aiScore >= 70) {
    cards.push({
      title: "AI Visibility Opportunity",
      impact: "Medium",
      detail:
        "The website shows signs of AI-search readiness and can strengthen visibility further through entity and topical optimization.",
    });
  } else {
    cards.push({
      title: "Low AI Discoverability",
      impact: "High",
      detail:
        "The brand has weak visibility signals for AI-generated discovery and answer engines.",
    });
  }

  if (data.keywordCount < 500) {
    cards.push({
      title: "Keyword Coverage Gap",
      impact: "Medium",
      detail:
        "The website appears to have limited ranking keyword coverage compared to stronger competitors.",
    });
  }

  if (!data.traffic || data.traffic <= 0) {
    cards.push({
      title: "Low Organic Visibility",
      impact: "High",
      detail:
        "Organic traffic visibility appears weak or unavailable, suggesting growth opportunities in content and SEO.",
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
        data.aiScore >= 70
          ? "Moderate"
          : "Directional",
      note:
        "AI visibility is a directional signal based on available prompt and model coverage.",
    },
  ];
}