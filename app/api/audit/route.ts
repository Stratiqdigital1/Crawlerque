import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security-headers";
import { prisma } from "@/lib/prisma";
import { checkFreeAuditRateLimit } from "@/lib/rate-limit";
import { verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { hasAuditLimit, canUseModule } from "@/lib/permissions";
import { getLocationCode } from "@/lib/dataforseo-config";

async function updateAuditJob(
  jobId: string,
  data: Record<string, any>
) {
  try {
    await prisma.auditJob.update({
      where: { id: jobId },
      data,
    });
  } catch (error) {
    console.error("Audit job update failed:", error);
  }
}

function getClientIp(req: Request) {
  // x-real-ip is set by Vercel/nginx and cannot be spoofed by the client.
  // x-forwarded-for rightmost value is the last trusted proxy addition;
  // the first value can be forged by the client, so we do NOT use [0].
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the LAST entry — added by your trusted reverse proxy.
    const parts = forwardedFor.split(",");
    return parts[parts.length - 1].trim();
  }

  return "unknown";
}

function validatePublicAuditUrl(input: string) {
  let parsed: URL;

  try {
    parsed = new URL(input.startsWith("http") ? input : `https://${input}`);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }

  const hostname = parsed.hostname.toLowerCase();

  const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];

  if (blockedHosts.includes(hostname)) {
    throw new Error("Localhost URLs are not allowed.");
  }

  if (
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    throw new Error("Private network URLs are not allowed.");
  }

  return parsed.toString();
}

function normalizeUrl(input: string) {
  if (!input) return "";
  const trimmed = input.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
  }
}

async function fetchHtml(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 Website Audit Bot",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000), // prevent hung audits
    });

    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function getTitle(html: string) {
  return html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() || "";
}

function getDescription(html: string) {
  return (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ||
    ""
  ).trim();
}

function countMatches(html: string, regex: RegExp) {
  return (html.match(regex) || []).length;
}

function buildIssues(input: {
  title: string;
  description: string;
  h1Count: number;
  imageCount: number;
  imagesMissingAlt: number;
  mobileScore: number;
}) {
  const issues: any[] = [];

  if (!input.title) {
    issues.push({
      title: "Missing page title",
      severity: "high",
      impact: "Search engines and users may not clearly understand the page topic.",
      fix: "Add a clear SEO title to the homepage.",
    });
  }

  if (!input.description) {
    issues.push({
      title: "Missing meta description",
      severity: "medium",
      impact: "Search result CTR may be weaker without a compelling description.",
      fix: "Add a clear meta description focused on the website’s core offer.",
    });
  }

  if (input.h1Count === 0) {
    issues.push({
      title: "Missing H1 heading",
      severity: "medium",
      impact: "The page has weaker content hierarchy and topical clarity.",
      fix: "Add one clear H1 that describes the main service or offer.",
    });
  }

  if (input.imagesMissingAlt > 0) {
    issues.push({
      title: "Images missing alt text",
      severity: "medium",
      impact: "Accessibility and image SEO signals are weaker.",
      fix: "Add descriptive alt text to important images.",
    });
  }

  if (input.mobileScore > 0 && input.mobileScore < 60) {
    issues.push({
      title: "Low mobile performance",
      severity: "high",
      impact: "Slow mobile speed can reduce conversions and organic visibility.",
      fix: "Optimize images, scripts, caching, and Core Web Vitals.",
    });
  }

  return issues;
}

async function getPageSpeed(url: string, strategy: "mobile" | "desktop") {
  try {
    const key = process.env.PAGESPEED_API_KEY;
    const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");

    apiUrl.searchParams.set("url", url);
    apiUrl.searchParams.set("strategy", strategy);
    if (key) apiUrl.searchParams.set("key", key);

    const res = await fetch(apiUrl.toString(), { cache: "no-store" });
    const json = await res.json();

    const lighthouse = json?.lighthouseResult;
    const categories = lighthouse?.categories;
    const audits = lighthouse?.audits;

    return {
      score: Math.round((categories?.performance?.score || 0) * 100),
      lcp: audits?.["largest-contentful-paint"]?.displayValue || "--",
      cls: audits?.["cumulative-layout-shift"]?.displayValue || "--",
      fcp: audits?.["first-contentful-paint"]?.displayValue || "--",
      tbt: audits?.["total-blocking-time"]?.displayValue || "--",
      speedIndex: audits?.["speed-index"]?.displayValue || "--",
    };
  } catch {
    return {
      score: 0,
      lcp: "--",
      cls: "--",
      fcp: "--",
      tbt: "--",
      speedIndex: "--",
    };
  }
}
async function getTodayAuditCount(userId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.auditReport.count({
    where: {
      userId,
      createdAt: {
        gte: startOfDay,
      },
    },
  });
}
async function getCachedAuditReport(userId: string, domain: string, reportTypes: string[]) {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const cached = await prisma.auditReport.findFirst({
    where: {
      userId,
      normalizedDomain: domain,
      createdAt: {
        gte: since,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!cached) return null;

  const cachedTypes = Array.isArray(cached.reportTypes)
    ? cached.reportTypes
    : [];

  const hasSameModules =
    reportTypes.length === cachedTypes.length &&
    reportTypes.every((type) => cachedTypes.includes(type));

  if (!hasSameModules) return null;

  return cached;
}

export async function GET() {
  return withSecurityHeaders(
    NextResponse.json({
      success: true,
      message: "Audit API is working. Use POST with a URL.",
    })
  );
}

export async function POST(req: Request) {
  let auditJob: any = null;

  try {
    const body = await req.json();

const incomingAuditJobId = body?.auditJobId
  ? String(body.auditJobId)
  : null;

const auditMode = body?.auditMode || "paid";
const isFreeAudit = auditMode === "free";
const clientIp = getClientIp(req);

   if (isFreeAudit) {
      const { allowed } = await checkFreeAuditRateLimit(clientIp);

      if (!allowed) {
        await prisma.auditLog.create({
          data: {
            userId: null,
            email: null,
            ip: clientIp,
            domain: body?.url || "unknown",
            auditMode: "free",
            reportTypes: body?.reportTypes || [],
            status: "blocked",
            message: "Free audit rate limit reached",
          },
        });

        return withSecurityHeaders(
          NextResponse.json(
            {
              success: false,
              error:
                "Free audit limit reached. You can run 2 free audits per day. Please log in or upgrade to continue.",
            },
            { status: 429 }
          )
        );
      }
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("stratiq_session")?.value;
    const session: any = token ? await verifySessionToken(token) : null;

    const user = session?.userId
      ? await prisma.user.findUnique({
          where: { id: session.userId },
          include: { package: true },
        })
      : null;

    if (!user && !isFreeAudit) {
      return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Please login first." },
    { status: 401 }
  )
);
    }

// Auto-reset if 30 days have passed since last reset (belt-and-suspenders alongside cron)
if (user && user.auditsResetAt) {
  const daysSinceReset =
    (Date.now() - new Date(user.auditsResetAt).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSinceReset >= 30 && user.role !== "admin") {
    await prisma.user.update({
      where: { id: user.id },
      data: { auditsUsed: 0, auditsResetAt: new Date() },
    });
    user.auditsUsed = 0;
  }
}

if (!isFreeAudit && user && !hasAuditLimit(user)) {
  return withSecurityHeaders(
    NextResponse.json(
      { success: false, error: "Monthly audit limit reached." },
      { status: 429 }
    )
  );
}

const dailyAuditLimit =
  user?.role === "admin" ? 999 : Math.max(1, Math.ceil((user?.package?.monthlyAudits || 5) / 30));

const todayAuditCount = user ? await getTodayAuditCount(user.id) : 0;

if (!isFreeAudit && user && todayAuditCount >= dailyAuditLimit) {
  return withSecurityHeaders(
  NextResponse.json(
    {
      success: false,
      error: `Daily audit limit reached. Your current plan allows ${dailyAuditLimit} audit(s) per day.`,
    },
    { status: 429 }
  )
);
}

        const allowAi = user ? canUseModule(user, "ai") : false;
    const allowTraffic = user ? canUseModule(user, "traffic") : false;
    const allowKeywords = user ? canUseModule(user, "keywords") : false;
    const allowBacklinks = user ? canUseModule(user, "backlinks") : false;
    const allowLocalSeo = user ? canUseModule(user, "localSeo") : false;
    const isFreeUser =
  isFreeAudit || (!user?.packageId && user?.role !== "admin");
    const allowedReportTypes = new Set<string>(["seo", "technical"]);

if (allowTraffic) {
  allowedReportTypes.add("traffic");
  allowedReportTypes.add("competitors");
}

if (allowKeywords) {
  allowedReportTypes.add("keywords");
  allowedReportTypes.add("serp");
}

if (allowAi) {
  allowedReportTypes.add("ai");
}

if (allowBacklinks) {
  allowedReportTypes.add("backlinks");
}

if (allowLocalSeo) {
  allowedReportTypes.add("localSeo");
}

if (user?.role === "admin") {
  [
    "seo",
    "technical",
    "traffic",
    "keywords",
    "competitors",
    "ai",
    "backlinks",
    "recommendations",
    "localSeo",
    "content",
    "serp",
  ].forEach((type) => allowedReportTypes.add(type));
}


    const inputUrl = body?.url || body?.domain;
    if (!inputUrl) {
  return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Website URL is required." },
    { status: 400 }
  )
);
}
    const requestedReportTypes = Array.isArray(body?.reportTypes)
  ? body.reportTypes
  : body?.reportType
  ? [body.reportType]
  : ["seo", "technical"];

const reportTypes = isFreeUser
  ? ["seo", "technical"]
  : requestedReportTypes.filter((type: string) =>
      allowedReportTypes.has(type)
    );

if (reportTypes.length === 0) {
  return withSecurityHeaders(
  NextResponse.json(
    {
      success: false,
      error: "Your current package does not allow the selected report modules.",
    },
    { status: 403 }
  )
);
}

    if (!inputUrl) {
      return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "URL is required" },
    { status: 400 }
  )
);
    }

const safeUrl = validatePublicAuditUrl(String(inputUrl));

const url = normalizeUrl(safeUrl);
const domain = extractDomain(url);
const locationCode = getLocationCode(domain);
const origin = new URL(req.url).origin;

const cachedAudit = user && !isFreeAudit && user.role !== "admin"
  ? await getCachedAuditReport(user.id, domain, reportTypes)
  : null;

if (cachedAudit) {

  await prisma.auditLog.create({
  data: {
    userId: user?.id || null,
    email: user?.email || null,
    ip: clientIp,
    domain,
    auditMode: isFreeAudit ? "free" : "paid",
    reportTypes,
    status: "success",
    message: isFreeAudit ? "Free audit completed" : "Paid audit completed",
  },
});
  return withSecurityHeaders(
  NextResponse.json({
    success: true,
    cached: true,
    reportId: cachedAudit.id,
    report: {
      ...(cachedAudit.reportData as any),
      reportId: cachedAudit.id,
      cached: true,
      cachedAt: cachedAudit.createdAt,
    },
  })
);
}
const hasModule = (module: string) => reportTypes.includes(module);

const runSEO = hasModule("seo");
const runTechnical = !isFreeAudit && hasModule("technical");
const runTraffic = !isFreeAudit && hasModule("traffic");
const runKeywordResearch = !isFreeAudit && hasModule("keywords");
const runCompetitors = !isFreeAudit && hasModule("competitors");
const runAI = !isFreeAudit && hasModule("ai");
const runBacklinks = !isFreeAudit && hasModule("backlinks");
const runRecommendations = !isFreeAudit && hasModule("recommendations");
const runContent = !isFreeAudit && hasModule("content");
const runLocal = !isFreeAudit && hasModule("localSeo");
const runSERP = !isFreeAudit && (runSEO || runTechnical || runKeywordResearch);

if (incomingAuditJobId) {
  auditJob = await prisma.auditJob.findFirst({
    where:
      user?.role === "admin"
        ? { id: incomingAuditJobId }
        : {
            id: incomingAuditJobId,
            userId: user?.id || "",
          },
  });

  if (!auditJob) {
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: "Audit job not found." },
        { status: 404 }
      )
    );
  }

  await updateAuditJob(auditJob.id, {
    status: "running",
    progress: 5,
    currentModule: "Initializing audit",
    startedAt: new Date(),
    moduleStatus: {},
  });
} else {
  auditJob = await prisma.auditJob.create({
    data: {
      userId: user?.id || null,
      domain,
      url,
      reportTypes,
      status: "running",
      progress: 5,
      currentModule: "Initializing audit",
      startedAt: new Date(),
      moduleStatus: {},
    },
  });
}

await updateAuditJob(auditJob.id, {
  progress: 15,
  currentModule: "Fetching website HTML",
});

    const html = await fetchHtml(url);
    const title = getTitle(html);
    const description = getDescription(html);

    const isPakistanDomain =
      domain.endsWith(".pk") ||
      description.toLowerCase().includes("pakistan") ||
      title.toLowerCase().includes("pakistan");

    const locationName =
      body?.locationName || (isPakistanDomain ? "Pakistan" : "United States");

    const languageName = body?.languageName || "English";

    const cleanSeedKeyword =
      title?.replace(/[-|–].*$/, "").trim() ||
      description?.split(".")?.[0] ||
      domain.replace(/\.(com|co|net|org|io|pk|us)$/i, "");

    const h1Count = countMatches(html, /<h1[\s>]/gi);
    const imageCount = countMatches(html, /<img[\s>]/gi);
    const imagesWithAlt = countMatches(
      html,
      /<img[^>]+alt=["'][^"']+["'][^>]*>/gi
    );
const imagesMissingAlt = Math.max(0, imageCount - imagesWithAlt);

    // ── AI CITATION READINESS — computed from the same HTML fetch above ──
    const bodyWordCount = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean).length;

    const ldJsonBlocks =
      html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    const hasSchema = ldJsonBlocks.length > 0;
    const hasFaqSchema = ldJsonBlocks.some((b) => /FAQPage/i.test(b));

    const geoFactors = [
      { label: "Has a clear H1 heading",         weight: 15, pass: h1Count > 0 },
      { label: "Has a meta description",         weight: 10, pass: !!description },
      { label: "Content depth (300+ words)",     weight: 20, pass: bodyWordCount >= 300 },
      { label: "In-depth content (800+ words)",  weight: 10, pass: bodyWordCount >= 800 },
      { label: "Has structured data (schema)",   weight: 20, pass: hasSchema },
      { label: "Has FAQ schema (FAQPage)",       weight: 15, pass: hasFaqSchema },
      { label: "All images have ALT text",       weight: 10, pass: imagesMissingAlt === 0 },
    ];
    const pageGeoScore = geoFactors.reduce((s, f) => s + (f.pass ? f.weight : 0), 0);
    const pageGeoGrade = pageGeoScore >= 75 ? "Strong" : pageGeoScore >= 45 ? "Moderate" : "Needs Work";
    const pageGeoTopIssue = geoFactors.filter((f) => !f.pass).sort((a, b) => b.weight - a.weight)[0]?.label || null;
    const pageGeoReadiness = { url, score: pageGeoScore, grade: pageGeoGrade, topIssue: pageGeoTopIssue, wordCount: bodyWordCount, factors: geoFactors };

await updateAuditJob(auditJob.id, {
  progress: 25,
  currentModule: "Running PageSpeed checks",
});

const mobileSpeed = await getPageSpeed(url, "mobile");
const desktopSpeed = await getPageSpeed(url, "desktop");

    const tabletScore =
      mobileSpeed.score && desktopSpeed.score
        ? Math.round((mobileSpeed.score + desktopSpeed.score) / 2)
        : 0;

await updateAuditJob(auditJob.id, {
  progress: 35,
  currentModule: "Running SEO intelligence modules",
});

let dataforseo: any = null;
let aiOptimization: any = null;
let aiSearchVisibility: any = null;
let serpData: any = null;
let onPage: any = null;
let keywordResearch: any = null;
let domainAnalytics: any = null;
let contentAnalysis: any = null;
let businessData: any = null;
let aiRecommendations: any = null;

let moduleStatus: any = {
  seo: runSEO ? "completed" : "skipped",
  technical: runTechnical ? "completed" : "skipped",

  dataforseo:
    runTraffic ||
    runKeywordResearch ||
    runCompetitors ||
    runBacklinks
      ? "running"
      : "skipped",

  aiOptimization: runAI ? "running" : "skipped",

  onPage: runTechnical ? "running" : "skipped",

  serp: runSERP ? "running" : "skipped",

  keywordResearch: runKeywordResearch ? "running" : "skipped",

  businessData: runLocal ? "running" : "skipped",

  domainAnalytics:
    runTraffic || runKeywordResearch
      ? "running"
      : "skipped",

  contentAnalysis: runContent ? "running" : "skipped",

  aiRecommendations:
    runRecommendations || runAI
      ? "running"
      : "skipped",
};

    if (runTraffic || runCompetitors || runBacklinks || runKeywordResearch) {
try {
  const dfsRes = await fetch(`${origin}/api/dataforseo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  url,
  locationName,
  languageName,
  locationCode,
}),
        cache: "no-store",
      });

      const dfsJson = await dfsRes.json();
      dataforseo = dfsJson?.dataforseo || null;
    } catch (error) {
  console.error("DataForSEO inside audit failed:", error);

  moduleStatus.dataforseo = "not_available";
}
}

    if (runSERP) {
try {
  const serpKeywords = Array.from(
  new Set(
    [
      cleanSeedKeyword,
      isPakistanDomain ? `${cleanSeedKeyword} pakistan` : null,
      ...(dataforseo?.topKeywords || [])
        .map((k: any) => k.keyword)
        .filter((keyword: string) => {
          const value = String(keyword || "").toLowerCase();

          return (
            value.length > 3 &&
            !/^\d/.test(value) &&
            !value.includes("movie") &&
            !value.includes("song") &&
            !value.includes("youtube") &&
            !value.includes("tiktok") &&
            !value.includes("reddit")
          );
        })
        .slice(0, 3),
    ]
      .filter(Boolean)
      .map((k: any) => String(k).trim())
  )
).slice(0, 5);

      const serpRes = await fetch(`${origin}/api/dataforseo/serp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          keywords: serpKeywords,
          locationName,
          languageName,
        }),
        cache: "no-store",
      });

      const serpJson = await serpRes.json();
      serpData = serpJson?.serpData || null;
    } catch (error) {
  console.error("SERP inside audit failed:", error);
}
}

    if (runAI) {

await updateAuditJob(auditJob.id, {
  progress: 60,
  currentModule: "Running AI visibility analysis",
});

try {
  const aiRes = await fetch(`${origin}/api/dataforseo/ai-optimization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          industry: cleanSeedKeyword || title || description || domain,
        }),
        cache: "no-store",
      });

const aiJson = await aiRes.json();
      aiOptimization = aiJson?.aiOptimization || null;

      // 🆕 LIVE AI MODELS — ChatGPT, Claude, Gemini (30s timeout; audit ko block nahi karta)
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 30000);
        const realRes = await fetch(`${origin}/api/ai-visibility`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain,
            brandName: domain,
            industry: cleanSeedKeyword || title || description || domain,
            competitors: (dataforseo?.competitors || []).map((c: any) => c.domain),
          }),
          signal: ctrl.signal,
          cache: "no-store",
        });
        clearTimeout(t);
        aiSearchVisibility = (await realRes.json())?.aiSearchVisibility || null;
      } catch {
        aiSearchVisibility = null;
      }
    } catch (error) {
  console.error("AI Optimization inside audit failed:", error);

  moduleStatus.aiOptimization = "not_available";
}
}

    if (runTechnical) {
try {
  const onPageStartRes = await fetch(`${origin}/api/dataforseo/onpage/start`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url,
    maxCrawlPages: 100,
  }),
  cache: "no-store",
});

const onPageStartJson = await onPageStartRes.json();

onPage = onPageStartJson?.taskId
  ? {
      taskId: onPageStartJson.taskId,
      crawlStatus: "started",
      crawledPages: 0,
      pages: [],
    }
  : null;
 } catch (error) {
  console.error("OnPage inside audit failed:", error);

  moduleStatus.onPage = "not_available";
}
}

    if (runTraffic) {
try {
  const domainAnalyticsRes = await fetch(
        `${origin}/api/dataforseo/domain-analytics`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, locationName, languageName }),
          cache: "no-store",
        }
      );

      const domainAnalyticsJson = await domainAnalyticsRes.json();
      domainAnalytics = domainAnalyticsJson?.domainAnalytics || null;
    } catch (error) {
  console.error("Domain Analytics inside audit failed:", error);

  moduleStatus.domainAnalytics = "not_available";
}
}

    if (runKeywordResearch) {
try {
  const keywordResearchRes = await fetch(
        `${origin}/api/dataforseo/keyword-research`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedKeyword: cleanSeedKeyword,
            keyword: cleanSeedKeyword,
            brandName: domain.replace(/\.(com|co|net|org|io|pk|us)$/i, ""),
            domain,
            locationName,
            languageName,
          }),
          cache: "no-store",
        }
      );

      const keywordResearchJson = await keywordResearchRes.json();
      keywordResearch = keywordResearchJson?.keywordResearch || null;
  } catch (error) {
  console.error("Keyword Research inside audit failed:", error);

  moduleStatus.keywordResearch = "not_available";
}
}
    if (
  (!keywordResearch?.suggestions || keywordResearch.suggestions.length === 0) &&
  dataforseo?.topKeywords?.length > 0
) {
  keywordResearch = {
    seedKeyword: cleanSeedKeyword,
    suggestions: dataforseo.topKeywords.map((k: any) => ({
      keyword: k.keyword,
      volume: k.volume,
      cpc: k.cpc,
      competition: k.competition || null,
      position: k.position,
      url: k.url,
    })),
    source: "DataForSEO ranked keywords fallback",
  };
}

    if (runContent) {
try {
  const contentAnalysisRes = await fetch(
        `${origin}/api/dataforseo/content-analysis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            keyword: cleanSeedKeyword,
            locationName,
            languageName,
          }),
          cache: "no-store",
        }
      );

      const contentAnalysisJson = await contentAnalysisRes.json();
      const rawContentAnalysis = contentAnalysisJson?.contentAnalysis || null;

const blockedContentDomains = [
  "upi.com",
  "apple.com",
  "blogspot.com",
  "podcasts.apple.com",
  "kioncentralcoast.com",
  "kion546.com",
  "bunnymaxim.com",
  "groovyfreeads.com",
];

if (rawContentAnalysis?.results?.length > 0) {
  contentAnalysis = {
    ...rawContentAnalysis,
    results: rawContentAnalysis.results.filter((item: any) => {
      const itemDomain = String(item.domain || "").toLowerCase();
      const itemUrl = String(item.url || "").toLowerCase();

      return !blockedContentDomains.some(
        (blocked) => itemDomain.includes(blocked) || itemUrl.includes(blocked)
      );
    }),
  };
} else {
  contentAnalysis = rawContentAnalysis;
}
    } catch (error) {
  console.error("Content Analysis inside audit failed:", error);

  moduleStatus.contentAnalysis = "not_available";
}
}

    if (runLocal) {
try {
  const businessRes = await fetch(`${origin}/api/dataforseo/business-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: cleanSeedKeyword,
          locationName,
          languageName,
        }),
        cache: "no-store",
      });

      const businessJson = await businessRes.json();
      businessData = businessJson?.businessData || null;
    } catch (error) {
  console.error("Business Data inside audit failed:", error);
}
}

    const seoScore = Math.max(
      0,
      Math.min(
        100,
        100 -
          (!title ? 15 : 0) -
          (!description ? 15 : 0) -
          (h1Count === 0 ? 15 : 0) -
          (imagesMissingAlt > 0 ? 10 : 0)
      )
    );

    const uxScore = Math.max(
      0,
      Math.min(
        100,
        95 -
          (mobileSpeed.score > 0 && mobileSpeed.score < 60 ? 15 : 0) -
          (imagesMissingAlt > 0 ? 5 : 0)
      )
    );

const aiVisibilityScore = aiOptimization?.visibilityScore ?? 0;
const aiVisibilityRawScore = aiOptimization?.rawVisibilityScore ?? aiVisibilityScore;
const aiVisibilityConfidence = aiOptimization?.confidence || "low";
const aiVisibilityLabel =
  aiOptimization?.scoreLabel || "Directional AI Visibility Signal";

const dfsTraffic = Number(dataforseo?.organicTraffic || 0);

// SINGLE SOURCE OF TRUTH — do not merge with domain-analytics.
const rawOrganicTraffic = Math.round(dfsTraffic || 0);

// calibration removed — position-capping now controls range.
let organicTraffic: number | null =
  rawOrganicTraffic > 0 ? rawOrganicTraffic : null;

let trafficCapped = false;

const organicKeywordCount = Number(
  dataforseo?.organicKeywords ||
    domainAnalytics?.organicKeywords ||
    0
);

// Only apply cap if keyword data is reliable
// Higher multiplier prevents legitimate large sites from being capped
// Traffic cap removed — show original DataForSEO hybrid traffic estimate.
trafficCapped = false;

const trafficSource = dataforseo?.trafficMethod || "ctr-curve";

const trafficConfidence =
  dataforseo?.trafficConfidence ||
  (organicTraffic ? "moderate" : "insufficient-data");

const trafficScore = organicTraffic
  ? Math.min(100, Math.round(organicTraffic / 50))
  : 0;

    const keywordGapPenalty =
      dataforseo?.keywordGap?.missingKeywords?.length || 0;

    const gapScore = Math.max(0, 100 - keywordGapPenalty * 3);

const backlinkScore =
  dataforseo?.backlinks?.referringDomains > 50
    ? 85
    : dataforseo?.backlinks?.referringDomains > 20
    ? 65
    : dataforseo?.backlinks?.referringDomains > 5
    ? 45
    : 25;

const organicTrafficForScore = Number(organicTraffic || 0);

const trafficHealthScore =
  organicTrafficForScore > 5000
    ? 85
    : organicTrafficForScore > 1000
    ? 65
    : organicTrafficForScore > 100
    ? 45
    : 20;

const overallScore = Math.round(
  seoScore * 0.3 +
    uxScore * 0.15 +
    (mobileSpeed.score || 0) * 0.25 +
    backlinkScore * 0.15 +
    (aiVisibilityScore || 0) * 0.15
);

    const issues = buildIssues({
      title,
      description,
      h1Count,
      imageCount,
      imagesMissingAlt,
      mobileScore: mobileSpeed.score,
    });

    if (onPage) {
      if (onPage.missingTitle > 0) {
        issues.push({
          title: "Missing title tags",
          severity: "medium",
          impact: `${onPage.missingTitle} crawled pages are missing title tags.`,
          fix: "Add unique, keyword-focused title tags to all important pages.",
        });
      }

      if (onPage.missingDescription > 0) {
        issues.push({
          title: "Missing meta descriptions",
          severity: "medium",
          impact: `${onPage.missingDescription} crawled pages are missing meta descriptions.`,
          fix: "Add clear meta descriptions to improve organic CTR.",
        });
      }

      if (onPage.brokenLinks > 0) {
        issues.push({
          title: "Broken links found",
          severity: "high",
          impact: `${onPage.brokenLinks} broken links were found during the crawl.`,
          fix: "Fix or redirect broken internal and external links.",
        });
      }

      if (onPage.duplicateTitle > 0) {
        issues.push({
          title: "Duplicate title tags",
          severity: "medium",
          impact: `${onPage.duplicateTitle} duplicate title tags were detected.`,
          fix: "Rewrite duplicate titles so each important page targets a unique intent.",
        });
      }
    }

    if (runRecommendations || runAI) {

await updateAuditJob(auditJob.id, {
  progress: 80,
  currentModule: "Generating AI recommendations",
});

try {
  const aiRecommendationsRes = await fetch(
        `${origin}/api/dataforseo/ai-recommendations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain,
            seedKeyword: cleanSeedKeyword,
            seoScore,
            uxScore,
            aiVisibilityScore,
aiVisibilityRawScore,
aiVisibilityConfidence,
aiVisibilityLabel,
monthlyTraffic: organicTraffic || null,
rawMonthly: rawOrganicTraffic || organicTraffic || null,
capped: trafficCapped || false,
trafficLabel: "Estimated Monthly Organic Visits",
trafficConfidence,
trafficSource,
trafficCapped,
rankedKeywordCount: dataforseo?.rankedKeywordCount ?? null,
filteredKeywordCount: dataforseo?.filteredKeywordCount ?? null,
organicKeywords: dataforseo?.organicKeywords || null,
            competitors: dataforseo?.competitors || [],
            keywordGaps: dataforseo?.keywordGap?.missingKeywords || [],
            issues,
            serpData,
            backlinks: dataforseo?.backlinks || null,
            contentAnalysis,
          }),
          cache: "no-store",
        }
      );

      const aiRecommendationsJson = await aiRecommendationsRes.json();
      aiRecommendations = aiRecommendationsJson?.aiRecommendations || null;
    } catch (error) {
  console.error("AI Recommendations failed:", error);
}
}
const cleanedRecommendations = (aiRecommendations?.recommendations || [])
  .map((rec: any) => String(rec || "").replace(/^"+|"+$/g, "").trim())
  .filter((rec: string) => {
    const value = rec.toLowerCase();

    return (
      rec.length > 20 &&
      rec !== "{}" &&
      rec !== "[]" &&
      !value.includes("tasks") &&
      !value.includes("status_code") &&
      !value.includes("api")
    );
  });

const fallbackRecommendations = [
  aiVisibilityScore === 0
  ? `Build stronger AI visibility for "${cleanSeedKeyword}" by adding clear entity signals, expert content, FAQs, schema, and third-party brand mentions.`
  : aiVisibilityConfidence === "low"
  ? `Expand AI visibility testing for "${cleanSeedKeyword}" because the current AI score is directional and based on a limited usable model sample.`
  : null,

  dataforseo?.organicKeywords <= 5
    ? `Expand organic visibility by creating supporting pages around "${cleanSeedKeyword}" and related commercial search intents.`
    : null,

  onPage?.crawledPages > 0
    ? `Use the OnPage crawl data to improve page titles, meta descriptions, H1 structure, internal links, and crawl depth across important pages.`
    : null,

  dataforseo?.backlinks?.referringDomains < 25
    ? "Improve authority by earning relevant backlinks from industry websites, local publications, directories, and partner mentions."
    : null,

  mobileSpeed.score === 0 || mobileSpeed.score < 60
    ? "Fix mobile performance issues because slow mobile experience can hurt conversions, UX, and organic visibility."
    : null,
].filter(Boolean);

const finalRecommendations =
  cleanedRecommendations.length > 0
    ? cleanedRecommendations
    : fallbackRecommendations;
    const unifiedOverview = {
      domain,
      overallStatus:
        overallScore == null
          ? "Data not available"
          : overallScore >= 80
          ? "Strong"
          : overallScore >= 60
          ? "Moderate"
          : "Needs Attention",

      availableModules: {
        seo: !!title || !!description || issues.length > 0,
        traffic: Number(organicTraffic || 0) > 0,
        keywords: !!dataforseo?.topKeywords?.length,
        contentAnalysis: !!contentAnalysis?.results?.length,
        competitors: !!dataforseo?.competitors?.length,
        backlinks: !!dataforseo?.backlinks,
        aiOptimization: !!aiOptimization,
        serp: !!serpData,
        onPage: !!onPage,
        keywordResearch: !!keywordResearch,
        businessData: !!businessData,
      },

      keyMetrics: {
        seoScore,
        aiVisibility: aiVisibilityScore,
aiVisibilityRawScore,
aiVisibilityConfidence,
aiVisibilityLabel,
monthlyTraffic: organicTraffic || null,
rawMonthly: rawOrganicTraffic || organicTraffic || null,
capped: trafficCapped || false,
trafficLabel: "Estimated Monthly Organic Visits",
trafficConfidence,
trafficSource,
        contentResultsFound: contentAnalysis?.results?.length ?? null,
        organicKeywords: dataforseo?.organicKeywords ?? null,
        competitorsFound: dataforseo?.competitors?.length ?? null,
        backlinks: dataforseo?.backlinks?.backlinks ?? null,
        serpKeywordsChecked: serpData?.checkedKeywords ?? null,
        serpFoundCount: serpData?.foundCount ?? null,
        pagesCrawled: onPage?.crawledPages ?? null,
        localListings: businessData?.listings?.length ?? null,
        domainOrganicTraffic: domainAnalytics?.organicTraffic ?? null,
        domainOrganicKeywords: domainAnalytics?.organicKeywords ?? null,
        paidTraffic: domainAnalytics?.paidTraffic ?? null,
        paidKeywords: domainAnalytics?.paidKeywords ?? null,
      },

      sourceCoverage: [
        dataforseo ? "DataForSEO Labs / Domain Data" : null,
        domainAnalytics ? "Domain Analytics" : null,
        aiOptimization ? "AI Optimization" : null,
        contentAnalysis ? "Content Analysis" : null,
        serpData ? "SERP" : null,
        onPage ? "OnPage" : null,
        keywordResearch ? "Keyword Data" : null,
        businessData ? "Business Data" : null,
      ].filter(Boolean),

      primaryOpportunity:
  dataforseo?.keywordGap?.missingKeywords?.length > 0
    ? "Competitor keyword gaps"
    : aiVisibilityScore === 0 || aiVisibilityConfidence === "low"
    ? "AI visibility confidence improvement"
    : onPage?.brokenLinks > 0
    ? "Technical SEO cleanup"
    : "Authority and visibility growth",
    };

    const traffic = {
  country: dataforseo?.country || locationName,
  monthly: organicTraffic,
  rawMonthly: rawOrganicTraffic,
  daily: organicTraffic ? Math.round(organicTraffic / 30) : null,
  source: trafficSource,
  method: dataforseo?.trafficMethod || "ctr-curve",
  label: "Estimated Monthly Organic Visits",
  confidence: trafficConfidence,
  capped: trafficCapped,
  rankedKeywordCount: dataforseo?.rankedKeywordCount ?? null,
  filteredKeywordCount: dataforseo?.filteredKeywordCount ?? null,
  debug: dataforseo?.trafficDebug || [],
  note:
    dataforseo?.trafficNote ||
    "Estimated from ranked keyword search volume and CTR curve. This is a modeled visibility estimate, not analytics traffic.",
  score:
    !organicTraffic
      ? "Insufficient Data"
      : organicTraffic > 25000
      ? "High"
      : organicTraffic > 5000
      ? "Medium"
      : "Low",
  keywords:
  dataforseo?.trafficDebug?.length > 0
    ? dataforseo.trafficDebug.map((k: any) => ({
        keyword: k.keyword,
        position: k.position,
        volume: k.searchVolume,
        traffic: k.estimatedVisits,
        estimatedVisits: k.estimatedVisits,
      }))
    : dataforseo?.topKeywords || [],
};

const aiVisibility = {
  score: aiVisibilityScore,
  rawScore: aiVisibilityRawScore,
  confidence: aiVisibilityConfidence,
  label: aiVisibilityLabel,
  totalMentions: aiOptimization?.totalMentions || 0,
  totalModels: aiOptimization?.totalModels || 0,
  validModelCount: aiOptimization?.validModelCount || 0,
  brand: aiOptimization?.brandName || domain,
  industry: aiOptimization?.industry || title || "",
  competitors:
    aiOptimization?.aiCompetitors ||
    aiOptimization?.competitors ||
    dataforseo?.competitors?.map((c: any) => c.domain) ||
    [],
  pageGeoReadiness,
};

moduleStatus = {
  seo: runSEO ? "completed" : "skipped",
  technical: runTechnical
    ? onPage?.pages?.length > 0
      ? "completed"
      : "partial"
    : "skipped",

  dataforseo:
    runTraffic || runKeywordResearch || runCompetitors || runBacklinks
      ? dataforseo
        ? "completed"
        : "failed"
      : "skipped",

  traffic:
    runTraffic
      ? traffic?.rawMonthly || traffic?.monthly
        ? "completed"
        : "partial"
      : "skipped",

aiOptimization:
    runAI
      ? aiOptimization
        ? "completed"
        : "failed"
      : "skipped",

  aiSearchVisibility:
    runAI
      ? aiSearchVisibility
        ? "completed"
        : "failed"
      : "skipped",

  onPage:
    runTechnical
      ? onPage?.pages?.length > 0
        ? "completed"
        : "partial"
      : "skipped",

  serp:
    runSERP
      ? serpData?.results?.length > 0
        ? "completed"
        : "failed"
      : "skipped",

  keywordResearch:
    runKeywordResearch
      ? keywordResearch?.suggestions?.length > 0
        ? "completed"
        : "failed"
      : "skipped",

  businessData:
    runLocal
      ? businessData?.listings?.length > 0
        ? "completed"
        : "failed"
      : "skipped",

  domainAnalytics:
    runTraffic || runKeywordResearch
      ? domainAnalytics
        ? "completed"
        : "partial"
      : "skipped",

  contentAnalysis:
    runContent
      ? contentAnalysis?.results?.length > 0
        ? "completed"
        : "failed"
      : "skipped",

  aiRecommendations:
    runRecommendations || runAI
      ? finalRecommendations?.length > 0
        ? "completed"
        : "partial"
      : "skipped",
};

await updateAuditJob(auditJob.id, {
  progress: 90,
  currentModule: "Building final report",
  moduleStatus,
});

    const report = {
      reportTypes,
      url,
      domain,
      moduleStatus,
      unifiedOverview,
      title,
      description,

      overallScore,
      seoScore,
      uxScore,

      speedScore: mobileSpeed.score,
      mobilePerformance: mobileSpeed.score,
      desktopPerformance: desktopSpeed.score,
      tabletPerformance: tabletScore,

      pageSpeed: {
        mobile: mobileSpeed,
        desktop: desktopSpeed,
        tablet: { score: tabletScore },
      },

      traffic,
      dataforseo,
      onPage,
      serpData,
      keywordResearch,
      domainAnalytics,
      contentAnalysis,

      competitors: dataforseo?.competitors || [],
      backlinks: dataforseo?.backlinks || null,
      keywordGap: dataforseo?.keywordGap || null,

aiVisibility,
      aiOptimization,
      aiSearchVisibility,
      businessData,

      issues,

      recommendations: finalRecommendations,
      aiRecommendations,

      summary: {
        biggestIssue:
  issues?.[0]?.title ||
  (aiVisibilityScore === 0
    ? "Low AI visibility"
    : aiVisibilityConfidence === "low"
    ? "AI visibility score is directional due to limited model coverage"
    : "No critical issue detected"),
        biggestOpportunity:
          dataforseo?.keywordGap?.missingKeywords?.length > 0
            ? "Competitor keyword gaps"
            : "Improve authority and AI visibility",
      },

    };

    let savedReport = null;

    if (user && !isFreeAudit) {
    try {
      savedReport = await prisma.auditReport.create({
        data: {
          userId: user.id,
          domain: report?.domain || domain,
          normalizedDomain: domain,

          reportTypes: reportTypes,
          reportData: report,

          overallScore: Number(report?.overallScore || 0),
          seoScore: Number(report?.seoScore || 0),
          uxScore: Number(report?.uxScore || 0),
          aiScore: Number(
            report?.aiVisibility?.score ||
              report?.aiOptimization?.visibilityScore ||
              0
          ),

          estimatedTraffic: Number(
            report?.traffic?.rawMonthly ||
              report?.traffic?.monthly ||
              report?.domainAnalytics?.organicTraffic ||
              0
          ),

          keywordCount: Number(
            report?.traffic?.rankedKeywordCount ||
              report?.dataforseo?.organicKeywords ||
              0
          ),
        },
      });
       } catch (saveError) {
      console.error("Audit report database save failed:", saveError);
    }
    }

if (user && !isFreeAudit && user.role !== "admin") {
  try {
    await prisma.user.update({
      where: { id: user.id },
      data:
        user.stripeStatus === "trialing"
          ? { trialAuditsUsed: { increment: 1 } }
          : { auditsUsed: { increment: 1 } },
    });
  } catch (error) {
    console.error("Audit usage increment failed:", error);
  }
}

    if (auditJob?.id) {
  await updateAuditJob(auditJob.id, {
    status: "completed",
    progress: 100,
    currentModule: "Completed",
    completedAt: new Date(),
    resultReportId: savedReport?.id || null,
    resultData: report,
  });
}

   // Log every successful audit for observability and usage tracking.
    try {
      await prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          email: user?.email || null,
          ip: clientIp,
          domain,
          auditMode: isFreeAudit ? "free" : "paid",
          reportTypes,
          status: "success",
          message: isFreeAudit ? "Free audit completed" : "Paid audit completed",
        },
      });
    } catch (logError) {
      // Never let logging failure break the response.
      console.error("AuditLog write failed:", logError);
    }

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        auditJobId: auditJob?.id || null,
        reportId: savedReport?.id || null,
        report: {
          ...report,
          auditJobId: auditJob?.id || null,
          reportId: savedReport?.id || null,
        },
      })
    );
} catch (error) {
  console.error("Audit API failed:", error);

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Audit API failed. Please try again.";

  if (auditJob?.id) {
    await updateAuditJob(auditJob.id, {
      status: "failed",
      progress: 100,
      currentModule: "Failed",
      error: errorMessage,
      failedAt: new Date(),
    });
  }

  return withSecurityHeaders(
    NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  );
  }
}