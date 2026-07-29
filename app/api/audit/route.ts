import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security-headers";
import { prisma } from "@/lib/prisma";
import { checkFreeAuditRateLimit } from "@/lib/rate-limit";
import { verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { hasAuditLimit, canUseModule } from "@/lib/permissions";
import { getLocationCode } from "@/lib/dataforseo-config";
import {
  AuditIdentityError,
  buildAuditIdentity,
} from "@/lib/audit-identity";
import {
  getPromoAccessForSession,
  PROMO_REPORT_TYPES,
} from "@/lib/promo-access";
import {
  commitAuditUsage,
  failAuditAndRestoreCredit,
  refundAuditUsage,
} from "@/lib/audit-usage";
import { reconcileAuditReport } from "@/lib/audit-reconciliation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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


async function fetchHtml(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 Website Audit Bot",
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {
        html: "",
        resolvedUrl: res.url || url,
      };
    }

    return {
      html: await res.text(),
      resolvedUrl: res.url || url,
    };
  } catch {
    return {
      html: "",
      resolvedUrl: url,
    };
  }
}

function getCanonicalUrl(html: string, resolvedUrl: string) {
  const match =
    html.match(/<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*canonical[^"']*["']/i);

  if (!match?.[1]) return resolvedUrl;

  try {
    return new URL(match[1], resolvedUrl).toString();
  } catch {
    return resolvedUrl;
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

function getTitle(html: string) {
  return decodeHtmlEntities(
    html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || ""
  );
}

function getDescription(html: string) {
  return decodeHtmlEntities(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ||
    ""
  );
}

function getFirstH1(html: string) {
  const raw = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  return decodeHtmlEntities(raw.replace(/<[^>]+>/g, " "));
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
  status: "completed",
  renderReady: true,
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
const customPrompts: string[] = Array.isArray(body?.customPrompts)
  ? body.customPrompts.map((p: any) => String(p || "").trim()).filter(Boolean).slice(0, 5)
  : [];
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

    const isPromoSession = Boolean(
      session?.promoAccessId
    );

    const promoAccess =
      isPromoSession
        ? await getPromoAccessForSession(
            session
          )
        : null;

    if (
      isPromoSession &&
      !promoAccess
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Promotional access is unavailable.",
          },
          {
            status: 403,
          }
        )
      );
    }

    if (!user && !isFreeAudit) {
      return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Please login first." },
    { status: 401 }
  )
);
    }

// Auto-reset if 30 days have passed since last reset (belt-and-suspenders alongside cron)
if (user && user.auditsResetAt && !promoAccess) {
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

if (
  !incomingAuditJobId &&
  !isFreeAudit &&
  user &&
  !promoAccess &&
  !hasAuditLimit(user)
) {
  return withSecurityHeaders(
    NextResponse.json(
      { success: false, error: "Monthly audit limit reached." },
      { status: 429 }
    )
  );
}

const dailyAuditLimit =
  promoAccess || user?.role === "admin"
    ? 999
    : Math.max(
        1,
        Math.ceil(
          (user?.package?.monthlyAudits ||
            user?.monthlyAudits ||
            5) / 30
        )
      );

const todayAuditCount =
  user && !promoAccess
    ? await getTodayAuditCount(user.id)
    : 0;

if (
  !incomingAuditJobId &&
  !isFreeAudit &&
  user &&
  !promoAccess &&
  todayAuditCount >= dailyAuditLimit
) {
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

        const allowAi = promoAccess ? true : user ? canUseModule(user, "ai") : false;
    const allowTraffic = promoAccess ? true : user ? canUseModule(user, "traffic") : false;
    const allowKeywords = promoAccess ? true : user ? canUseModule(user, "keywords") : false;
    const allowBacklinks = promoAccess ? true : user ? canUseModule(user, "backlinks") : false;
    const allowLocalSeo = promoAccess ? true : user ? canUseModule(user, "localSeo") : false;
    const isFreeUser =
  isFreeAudit ||
  (
    !promoAccess &&
    !user?.packageId &&
    user?.role !== "admin"
  );
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

if (promoAccess) {
  PROMO_REPORT_TYPES.forEach(
    (type) =>
      allowedReportTypes.add(type)
  );
}


const inputUrl = body?.url || body?.domain;

if (
  !isFreeAudit &&
  !incomingAuditJobId
) {
  return withSecurityHeaders(
    NextResponse.json(
      {
        success: false,
        error:
          "Start an audit job before running a paid, trial, or promotional audit.",
      },
      {
        status: 400,
      }
    )
  );
}

if (!inputUrl) {
  return withSecurityHeaders(
    NextResponse.json(
      {
        success: false,
        error: "Website URL is required.",
      },
      {
        status: 400,
      }
    )
  );
}

const requestedReportTypes = Array.isArray(
  body?.reportTypes
)
  ? body.reportTypes.map((type: unknown) =>
      String(type)
    )
  : body?.reportType
    ? [String(body.reportType)]
    : ["seo", "technical"];

const permittedReportTypes = promoAccess
  ? [...PROMO_REPORT_TYPES]
  : isFreeUser
    ? ["seo", "technical"]
    : requestedReportTypes.filter(
        (type: string) =>
          allowedReportTypes.has(type)
      );

if (permittedReportTypes.length === 0) {
  return withSecurityHeaders(
    NextResponse.json(
      {
        success: false,
        error:
          "Your current package does not allow the selected report modules.",
      },
      {
        status: 403,
      }
    )
  );
}

/*
 * Authenticated audits use the real user ID.
 * A legacy free audit receives a temporary identity
 * based on its client IP.
 */
const auditOwnerIdentity =
  user?.id ||
  session?.userId ||
  `free:${clientIp}`;

let auditIdentity;

try {
  auditIdentity = buildAuditIdentity({
    userId: auditOwnerIdentity,
    url: String(inputUrl),
    reportTypes: permittedReportTypes,
  });
} catch (error) {
  if (error instanceof AuditIdentityError) {
    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 400,
        }
      )
    );
  }

  throw error;
}

const {
  normalizedUrl: url,
  normalizedDomain: domain,
  reportTypes,
  inputHash,
} = auditIdentity;

const locationCode = getLocationCode(domain);
const origin = new URL(req.url).origin;

/*
 * Load and validate the exact job created by
 * /api/audit-jobs/start.
 */
if (incomingAuditJobId) {
  if (!user?.id) {
    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "An authenticated user is required for this audit job.",
        },
        {
          status: 401,
        }
      )
    );
  }

  auditJob = await prisma.auditJob.findFirst({
    where: {
      id: incomingAuditJobId,
      userId: user.id,
    },
  });

  if (!auditJob) {
    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error: "Audit job not found.",
        },
        {
          status: 404,
        }
      )
    );
  }

  if (
    !auditJob.inputHash ||
    !auditJob.normalizedDomain
  ) {
    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "This audit job was created before the security update. Please start a new audit.",
        },
        {
          status: 409,
        }
      )
    );
  }

  const jobReportTypes = Array.isArray(
    auditJob.reportTypes
  )
    ? auditJob.reportTypes
        .map((type: unknown) => String(type))
        .sort((a: string, b: string) =>
          a.localeCompare(b)
        )
    : [];

  const sameReportTypes =
    jobReportTypes.length ===
      reportTypes.length &&
    reportTypes.every(
      (type, index) =>
        type === jobReportTypes[index]
    );

  const identityMismatch =
    auditJob.inputHash !== inputHash ||
    auditJob.normalizedDomain !== domain ||
    auditJob.url !== url ||
    !sameReportTypes;

  if (identityMismatch) {
    const userMessage =
      "The audit request did not match the reserved job. Your audit credit was restored.";

    await failAuditAndRestoreCredit({
      jobId: auditJob.id,
      failureCode:
        "AUDIT_IDENTITY_MISMATCH",
      internalError:
        "The audit URL, domain, user, or selected modules did not match the original job.",
      userMessage,
      currentModule:
        "Audit identity validation failed",
    });

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error: userMessage,
          traceId:
            auditJob.traceId,
          creditRestored: true,
        },
        {
          status: 409,
        }
      )
    );
  }

  if (
    ["failed", "cancelled"].includes(
      auditJob.status
    )
  ) {
    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "This audit job is no longer active. Please start a new audit.",
        },
        {
          status: 409,
        }
      )
    );
  }

  await updateAuditJob(auditJob.id, {
    status: "running",
    progress: 5,
    currentModule: "Initializing audit",
    startedAt:
      auditJob.startedAt || new Date(),
    completedAt: null,
    failedAt: null,
    error: null,
    moduleStatus: {},
    technicalTaskId: null,
    renderReady: false,
  });
} else {
  auditJob = await prisma.auditJob.create({
    data: {
      userId: user?.id || null,
      domain,
      normalizedDomain: domain,
      url,
      inputHash,
      reportTypes,
      status: "running",
      progress: 5,
      currentModule: "Initializing audit",
      startedAt: new Date(),
      moduleStatus: {},
      technicalTaskId: null,
      renderReady: false,
      usageCounted: false,
      traceId: `CQ-FREE-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`,
      usageSource: "free",
      usageState: "not_required",
    },
  });
}

/*
 * Cached reports are accepted only after the
 * current job has been validated.
 */
const cachedAudit =
  user &&
  !isFreeAudit &&
  !promoAccess &&
  user.role !== "admin"
    ? await getCachedAuditReport(
        user.id,
        domain,
        reportTypes
      )
    : null;

if (cachedAudit && user) {
  await refundAuditUsage(
    auditJob.id
  );

  const cachedReportData = reconcileAuditReport(
    cachedAudit.reportData,
    {
      renderReady: true,
      reportStatus: cachedAudit.status,
      completedAt:
        cachedAudit.completedAt?.toISOString() ||
        cachedAudit.updatedAt.toISOString(),
    }
  );

  const cachedModuleStatus =
    cachedReportData?.moduleStatus &&
    typeof cachedReportData.moduleStatus ===
      "object"
      ? cachedReportData.moduleStatus
      : {};

  await updateAuditJob(auditJob.id, {
    status: "completed",
    progress: 100,
    currentModule:
      "Completed from verified cache",
    moduleStatus: cachedModuleStatus,
    completedAt: new Date(),
    resultReportId: cachedAudit.id,
    resultData: cachedReportData,
    renderReady: true,
    usageState: "refunded",
    userMessage:
      "A verified cached report was returned. Your audit credit was restored.",
  });

  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        email: user.email || null,
        ip: clientIp,
        domain,
        auditMode: "paid",
        reportTypes,
        status: "success",
        message:
          "Verified cached audit returned",
      },
    });
  } catch (logError) {
    console.error(
      "Cached audit log failed:",
      logError
    );
  }

  return withSecurityHeaders(
    NextResponse.json({
      success: true,
      cached: true,
      auditJobId: auditJob.id,
      traceId:
        auditJob.traceId,
      reportId: cachedAudit.id,
      renderReady: true,
      creditRestored: true,
      report: {
        ...cachedReportData,
        auditJobId: auditJob.id,
        reportId: cachedAudit.id,
        cached: true,
        cachedAt: cachedAudit.createdAt,
        renderReady: true,
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

await updateAuditJob(auditJob.id, {
  progress: 15,
  currentModule: "Fetching website HTML",
});

    const htmlResult = await fetchHtml(url);
    const html = htmlResult.html;
    const resolvedUrl = htmlResult.resolvedUrl || url;
    const canonicalUrl = getCanonicalUrl(html, resolvedUrl);
    const auditTargetUrl = canonicalUrl || resolvedUrl || url;
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

    const brandNameForAudit =
      title?.split(/[|–—]/)[0]?.trim() ||
      domain.split(".")[0].replace(/[-_]+/g, " ");

    const h1Count = countMatches(html, /<h1[\s>]/gi);
    const h1 = getFirstH1(html);
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
    const pageGeoReadiness = {
      url: auditTargetUrl,
      score: pageGeoScore,
      grade: pageGeoGrade,
      topIssue: pageGeoTopIssue,
      wordCount: bodyWordCount,
      factors: geoFactors,
    };

await updateAuditJob(auditJob.id, {
  progress: 25,
  currentModule: "Running PageSpeed checks",
});

const mobileSpeed = await getPageSpeed(auditTargetUrl, "mobile");
const desktopSpeed = await getPageSpeed(auditTargetUrl, "desktop");

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
        const categoryKeywords = (dataforseo?.topKeywords || [])
          .filter((keyword: any) => keyword?.branded !== true)
          .map((keyword: any) => String(keyword?.keyword || "").trim())
          .filter(Boolean)
          .slice(0, 8);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 110000);

        const aiResponse = await fetch(`${origin}/api/ai-visibility`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: auditTargetUrl,
            domain,
            brandName: brandNameForAudit,
            industry: dataforseo?.detectedNiche || "",
            categoryKeywords,
            country: locationName,
            locationName,
            competitors: (dataforseo?.competitors || []).map(
              (competitor: any) => competitor.domain
            ),
            customPrompts,
          }),
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(timeout);

        const aiJson = await aiResponse.json();

        if (!aiResponse.ok || !aiJson?.success) {
          throw new Error(
            aiJson?.error || "AI visibility analysis could not be completed."
          );
        }

        aiSearchVisibility = aiJson?.aiSearchVisibility || null;

        // Compatibility object only. It uses the same canonical v2 result and
        // does not trigger the old duplicate AI Optimization request.
        aiOptimization = aiSearchVisibility
          ? {
              canonical: true,
              methodologyVersion:
                aiSearchVisibility.methodologyVersion || "2.0",
              visibilityScore: aiSearchVisibility.overallScore,
              rawVisibilityScore: aiSearchVisibility.overallScore,
              confidence: aiSearchVisibility.confidence,
              scoreLabel: "Canonical AI Search Visibility",
              totalMentions: aiSearchVisibility.brandMentionCount || 0,
              totalModels: Array.isArray(aiSearchVisibility.modelsExpected)
                ? aiSearchVisibility.modelsExpected.length
                : 3,
              validModelCount: Array.isArray(aiSearchVisibility.modelsCalled)
                ? aiSearchVisibility.modelsCalled.length
                : 0,
              brandName: aiSearchVisibility.brand,
              industry: aiSearchVisibility.industry,
              aiCompetitors: aiSearchVisibility.topCompetitors || [],
              competitors: aiSearchVisibility.topCompetitors || [],
              promptResults: aiSearchVisibility.promptResults || [],
            }
          : null;
      } catch (error) {
        console.error("Canonical AI visibility inside audit failed:", error);
        aiSearchVisibility = null;
        aiOptimization = null;
        moduleStatus.aiOptimization = "not_available";
        moduleStatus.aiSearchVisibility = "not_available";
      }
    }

const requestedCrawlPageLimit = Math.min(
  100,
  Math.max(1, Number(body?.maxCrawlPages || 100))
);

if (runTechnical) {
  try {
    const cookieHeader =
      req.headers.get("cookie");

    const onPageHeaders:
      Record<string, string> = {
        "Content-Type":
          "application/json",
      };

    if (cookieHeader) {
      onPageHeaders.cookie =
        cookieHeader;
    }

    const onPageStartRes =
      await fetch(
        `${origin}/api/dataforseo/onpage/start`,
        {
          method: "POST",

          headers:
            onPageHeaders,

          body: JSON.stringify({
            url: auditTargetUrl,
            maxCrawlPages: requestedCrawlPageLimit,

            auditJobId:
              auditJob.id,

            inputHash,

            normalizedDomain:
              domain,
          }),

          cache: "no-store",
        }
      );

    const onPageStartJson =
      await onPageStartRes.json();

    if (
      !onPageStartRes.ok ||
      !onPageStartJson?.success ||
      !onPageStartJson?.taskId
    ) {
      throw new Error(
        onPageStartJson?.error ||
          "Technical crawl could not be started."
      );
    }

    onPage = {
      auditJobId:
        auditJob.id,

      taskId:
        onPageStartJson.taskId,

      inputHash,

      normalizedDomain:
        domain,

      crawlStatus: "started",

      crawledPages: 0,

      pageLimit:
        Number(onPageStartJson?.pageLimit || requestedCrawlPageLimit),

      discoveredPages: 0,
      completedPages: 0,
      failedPages: 0,
      remainingPages: 0,
      coveragePercent: 0,
      confidence: "processing",
      pages: [],
    };

    moduleStatus.technical =
      "running";

    moduleStatus.onPage =
      "running";
  } catch (error) {
    console.error(
      "OnPage inside audit failed:",
      error
    );

    onPage = null;

    moduleStatus.technical =
      "failed";

    moduleStatus.onPage =
      "failed";
  }
}

    if (runTraffic) {
try {
  const domainAnalyticsRes = await fetch(
        `${origin}/api/dataforseo/domain-analytics`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: auditTargetUrl,
            locationName,
            languageName,
            locationCode,
          }),
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
            url: auditTargetUrl,
            maxPages: Math.min(
              20,
              Math.max(1, Number(body?.contentPageLimit || 10))
            ),
          }),
          cache: "no-store",
        }
      );

      const contentAnalysisJson = await contentAnalysisRes.json();

      if (!contentAnalysisRes.ok || !contentAnalysisJson?.success) {
        throw new Error(
          contentAnalysisJson?.error ||
            "First-party Content Quality analysis could not be completed."
        );
      }

      contentAnalysis = contentAnalysisJson?.contentAnalysis || null;
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
          url: auditTargetUrl,
          domain,
          brandName: brandNameForAudit,
          serviceKeyword:
            (dataforseo?.topKeywords || [])
              .find((item: any) => item?.branded !== true)
              ?.keyword || cleanSeedKeyword,
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

const aiVisibilityScore = Number(
  aiSearchVisibility?.overallScore ?? 0
);
const aiVisibilityRawScore = aiVisibilityScore;
const aiVisibilityConfidence =
  aiSearchVisibility?.confidence || "low";
const aiVisibilityLabel = aiSearchVisibility
  ? "Canonical AI Search Visibility"
  : "AI visibility unavailable";

const dfsTraffic = Number(dataforseo?.organicTraffic || 0);

// SINGLE SOURCE OF TRUTH — do not merge with domain-analytics.
const rawOrganicTraffic = Math.round(dfsTraffic || 0);

// calibration removed — position-capping now controls range.
let organicTraffic: number | null =
  rawOrganicTraffic > 0 ? rawOrganicTraffic : null;

let trafficCapped = false;

const organicKeywordCount = Number(
  dataforseo?.rankedKeywordCount ||
    dataforseo?.totalRankedKeywordsFetched ||
    dataforseo?.organicKeywords ||
    0
);

// Sanity cap: only fire on reliable keyword data (>1000 keywords) and use a
// high multiplier (×200) so legitimate large-site estimates aren't cut.
// (overview keyword counts can be wrong/low, so ×50 was clipping real traffic.)
if (
  organicTraffic != null &&
  organicKeywordCount > 1000 &&
  organicTraffic > organicKeywordCount * 200
) {
  organicTraffic = organicKeywordCount * 200;
  trafficCapped = true;
  console.warn(
    `[traffic] capped ${rawOrganicTraffic} -> ${organicTraffic} (keywords ${organicKeywordCount} x 200)`
  );
}

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
            businessType: dataforseo?.detectedNiche || "general",
            detectedNiche: dataforseo?.detectedNiche || "general",
            canonicalSeo: {
              title,
              metaDescription: description,
              h1,
              homepageUrl: auditTargetUrl,
            },
            pageSpeed: {
              mobile: mobileSpeed,
              desktop: desktopSpeed,
            },
            onPage,
            aiSearchVisibility,
            pageInsights: aiSearchVisibility?.pageInsights || null,
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
const normalizeRecommendation = (recommendation: any, index: number) => {
  if (!recommendation) return null;

  if (typeof recommendation === "string") {
    const detail = recommendation.replace(/^"+|"+$/g, "").trim();
    if (!detail) return null;

    return {
      id: `legacy-${index + 1}`,
      title: detail.split(".")[0] || `Recommendation ${index + 1}`,
      detail,
      sourceModule: "Recommendations",
      impact: "Medium",
      effort: "Medium",
      owner: "Growth Team",
      timeline: "31–60 days",
      expectedImpact: "Improve website growth performance.",
      affectedUrls: [],
      evidence: [],
      validationStatus: "directional",
      confidence: "directional",
    };
  }

  return recommendation;
};

const finalRecommendations = (aiRecommendations?.recommendations || [])
  .map(normalizeRecommendation)
  .filter(Boolean)
  .slice(0, 10);

const actionRoadmap =
  aiRecommendations?.roadmap || {
    first30Days: finalRecommendations.filter(
      (item: any) => item?.timeline === "0–30 days"
    ),
    next30Days: finalRecommendations.filter(
      (item: any) => item?.timeline === "31–60 days"
    ),
    final30Days: finalRecommendations.filter(
      (item: any) => item?.timeline === "61–90 days"
    ),
  };
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
        aiSearchVisibility ? "AI Visibility v2" : null,
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

const aiVisibility = aiSearchVisibility
  ? {
      score: aiVisibilityScore,
      rawScore: aiVisibilityRawScore,
      confidence: aiVisibilityConfidence,
      label: aiVisibilityLabel,
      totalMentions: aiSearchVisibility?.brandMentionCount || 0,
      totalModels: Array.isArray(aiSearchVisibility?.modelsExpected)
        ? aiSearchVisibility.modelsExpected.length
        : 3,
      validModelCount: Array.isArray(aiSearchVisibility?.modelsCalled)
        ? aiSearchVisibility.modelsCalled.length
        : 0,
      shareOfVoice: aiSearchVisibility?.shareOfVoice || 0,
      brand: aiSearchVisibility?.brand || domain,
      industry: aiSearchVisibility?.industry || "",
      competitors: aiSearchVisibility?.topCompetitors || [],
      pageGeoReadiness,
      canonical: true,
      methodologyVersion: aiSearchVisibility?.methodologyVersion || "2.0",
    }
  : null;

moduleStatus = {
  seo: runSEO ? "completed" : "skipped",
technical: runTechnical
  ? onPage?.crawlStatus ===
    "completed"
    ? "completed"
    : onPage?.taskId
      ? "running"
      : "failed"
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
    ? onPage?.crawlStatus ===
      "completed"
      ? "completed"
      : onPage?.taskId
        ? "running"
        : "failed"
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
        : businessData
          ? "partial"
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
      ? Number(contentAnalysis?.analyzedPages || contentAnalysis?.results?.length || 0) > 0
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

const draftReport = {
  auditJobId: auditJob.id,
  inputHash,
  normalizedDomain: domain,
  renderReady: false,

  reportTypes,
  url,
  submittedUrl: url,
  resolvedUrl,
  canonicalUrl,
  domain,
  moduleStatus,
      unifiedOverview,
      title,
      description,
      h1,
      h1Count,
      imagesMissingAlt,
      searchContext: {
        country: locationName,
        language: languageName,
        locationCode,
        device: body?.device || "mobile-and-desktop",
      },

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
      providerSignals: {
        domainAnalytics,
      },
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
      actionRoadmap,
      aiRecommendations: aiRecommendations
        ? {
            ...aiRecommendations,
            roadmap: actionRoadmap,
          }
        : null,

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

    const waitingForTechnicalCrawl =
      runTechnical &&
      Boolean(onPage?.taskId) &&
      onPage?.crawlStatus !==
        "completed";

    const completedWithLimitation =
      !waitingForTechnicalCrawl &&
      runTechnical &&
      ["failed", "timed_out"].includes(
        String(
          moduleStatus?.technical ||
            moduleStatus?.onPage ||
            ""
        )
      );

    const finalJobStatus =
      waitingForTechnicalCrawl
        ? "processing_technical"
        : completedWithLimitation
          ? "completed_with_limitation"
          : "completed";

    const renderReady =
      !waitingForTechnicalCrawl;

    const completedAt =
      renderReady
        ? new Date()
        : null;

    const report = reconcileAuditReport(
      draftReport,
      {
        renderReady,
        reportStatus: finalJobStatus,
        completedAt:
          completedAt?.toISOString() ||
          null,
      }
    );

    const reportForStorage = report;

    let savedReport:
      | {
          id: string;
        }
      | null = null;

    if (
      user &&
      !isFreeAudit
    ) {
      savedReport =
        await prisma.auditReport.upsert({
          where: {
            auditJobId:
              auditJob.id,
          },
          create: {
            userId: user.id,
            domain:
              report?.domain ||
              domain,
            normalizedDomain:
              domain,
            auditJobId:
              auditJob.id,
            inputHash,
            status:
              finalJobStatus,
            renderReady,
            moduleStatus: report.moduleStatus,
            completedAt,
            reportTypes,
            reportData:
              reportForStorage,
            overallScore:
              report?.overallScore ?? null,
            seoScore:
              report?.seoScore ?? null,
            uxScore:
              report?.uxScore ?? null,
            aiScore:
              report?.aiScore ?? null,
            estimatedTraffic:
              report?.estimatedTraffic ?? null,
            keywordCount:
              report?.keywordCount ?? null,
          },
          update: {
            domain:
              report?.domain ||
              domain,
            normalizedDomain:
              domain,
            inputHash,
            status:
              finalJobStatus,
            renderReady,
            moduleStatus: report.moduleStatus,
            completedAt,
            reportTypes,
            reportData:
              reportForStorage,
            overallScore:
              report?.overallScore ?? null,
            seoScore:
              report?.seoScore ?? null,
            uxScore:
              report?.uxScore ?? null,
            aiScore:
              report?.aiScore ?? null,
            estimatedTraffic:
              report?.estimatedTraffic ?? null,
            keywordCount:
              report?.keywordCount ?? null,
          },
          select: {
            id: true,
          },
        });
    }

    await updateAuditJob(
      auditJob.id,
      {
        status:
          finalJobStatus,
        progress:
          waitingForTechnicalCrawl
            ? 92
            : 100,
        currentModule:
          waitingForTechnicalCrawl
            ? "Waiting for technical crawl"
            : completedWithLimitation
              ? "Completed with a technical limitation"
              : "Completed",
        moduleStatus: report.moduleStatus,
        completedAt,
        failedAt: null,
        technicalTaskId:
          onPage?.taskId ||
          null,
        resultReportId:
          savedReport?.id ||
          null,
        resultData:
          reportForStorage,
        renderReady,
        userMessage:
          waitingForTechnicalCrawl
            ? "The main audit is complete. The technical crawl is still being finalized."
            : completedWithLimitation
              ? "The audit is ready, but the technical crawl ended with a limitation."
              : "Audit completed successfully.",
      }
    );

    if (
      renderReady &&
      !isFreeAudit
    ) {
      await commitAuditUsage(
        auditJob.id
      );
    }

   // Log every successful audit for observability and usage tracking.
    try {
      await prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          email:
            promoAccess?.label ||
            user?.email ||
            null,
          ip: clientIp,
          domain,
          auditMode: promoAccess
            ? "promo"
            : isFreeAudit
              ? "free"
              : "paid",
          reportTypes,
          status:
            waitingForTechnicalCrawl
              ? "processing"
              : "success",
          message:
            waitingForTechnicalCrawl
              ? "Audit saved while the technical crawl is still processing"
              : completedWithLimitation
                ? "Audit completed with a technical limitation"
                : promoAccess
                  ? "Promotional full audit completed"
                  : isFreeAudit
                    ? "Free audit completed"
                    : "Paid audit completed",
        },
      });
    } catch (logError) {
      // Never let logging failure break the response.
      console.error("AuditLog write failed:", logError);
    }

return withSecurityHeaders(
  NextResponse.json({
    success: true,
    auditJobId:
      auditJob?.id || null,
    traceId:
      auditJob?.traceId ||
      null,
    reportId:
      savedReport?.id ||
      null,
    renderReady,
    usageState:
      renderReady
        ? isFreeAudit
          ? "not_required"
          : "committed"
        : auditJob
            ?.usageState ||
          "reserved",
    report: {
      ...report,
      auditJobId: auditJob?.id || null,
      reportId: savedReport?.id || null,
      renderReady,
    },
  })
);
} catch (error) {
  console.error(
    "Audit API failed:",
    error
  );

  const internalError =
    error instanceof Error
      ? error.message
      : typeof error ===
          "string"
        ? error
        : "Unknown audit failure";

  const traceId =
    auditJob?.traceId ||
    `CQ-UNTRACKED-${Date.now()
      .toString(36)
      .toUpperCase()}`;

  const hadReservedCredit =
    auditJob?.usageState ===
    "reserved";

  const userMessage =
    hadReservedCredit
      ? `Audit could not be completed. Your audit credit was restored. Reference: ${traceId}`
      : `Audit could not be completed. Reference: ${traceId}`;

  if (auditJob?.id) {
    try {
      await failAuditAndRestoreCredit({
        jobId:
          auditJob.id,
        failureCode:
          "AUDIT_EXECUTION_FAILED",
        internalError,
        userMessage,
        currentModule:
          "Audit failed",
      });

      await prisma.auditReport.updateMany({
        where: {
          auditJobId:
            auditJob.id,
        },
        data: {
          status:
            "failed",
          renderReady:
            false,
          completedAt:
            null,
          moduleStatus: {
            failed:
              true,
          },
        },
      });
    } catch (
      finalizationError
    ) {
      console.error(
        "Audit failure finalization failed:",
        finalizationError
      );
    }
  }

  return withSecurityHeaders(
    NextResponse.json(
      {
        success: false,
        error:
          userMessage,
        traceId,
        creditRestored:
          hadReservedCredit,
      },
      {
        status: 500,
      }
    )
  );
}
}
