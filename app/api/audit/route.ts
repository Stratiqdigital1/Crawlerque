import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security-headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { hasAuditLimit, canUseModule } from "@/lib/permissions";
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
import {
  getAuditScopeKey,
} from "@/lib/audit-scope";

import {
  filterRelevantKeywordItems,
  isKeywordRelevantToBusiness,
  resolveBusinessContext,
} from "@/lib/business-context";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Full audits call several external services.
 * Give the orchestrator enough time to return
 * a controlled success or failure response.
 */
export const maxDuration = 300;

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
  let currentUrl = url;
  let redirectCount = 0;

  const browserHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/150.0.0.0 Safari/537.36",

    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

    "Accept-Language":
      "en-US,en;q=0.9",

    "Cache-Control":
      "no-cache",

    Pragma:
      "no-cache",

    "Upgrade-Insecure-Requests":
      "1",
  };

  try {
    for (
      let hop = 0;
      hop <= 10;
      hop++
    ) {
      let res = await fetch(
        currentUrl,
        {
          headers:
            browserHeaders,

          redirect:
            "manual",

          cache:
            "no-store",

          signal:
            AbortSignal.timeout(
              8000
            ),
        }
      );

      /*
       * Some WAFs reject obvious first-pass
       * automated requests. Retry once with
       * a same-origin referrer before marking
       * the homepage unavailable.
       */
      if (res.status === 403) {
        try {
          const parsedUrl =
            new URL(currentUrl);

          res = await fetch(
            currentUrl,
            {
              headers: {
                ...browserHeaders,

                Referer:
                  `${parsedUrl.protocol}//${parsedUrl.hostname}/`,
              },

              redirect:
                "manual",

              cache:
                "no-store",

              signal:
                AbortSignal.timeout(
                  8000
                ),
            }
          );
        } catch {
          // Continue with original
          // 403 response.
        }
      }

      if (
        res.status >= 300 &&
        res.status < 400
      ) {
        const location =
          res.headers.get(
            "location"
          );

        if (!location) {
          return {
            html: "",
            resolvedUrl:
              currentUrl,
            redirectCount,
            fetchStatus:
              res.status,
          };
        }

        currentUrl =
          new URL(
            location,
            currentUrl
          ).toString();

        redirectCount += 1;

        continue;
      }

      if (!res.ok) {
        return {
          html: "",
          resolvedUrl:
            res.url ||
            currentUrl,

          redirectCount,

          fetchStatus:
            res.status,
        };
      }

      return {
        html:
          await res.text(),

        resolvedUrl:
          res.url ||
          currentUrl,

        redirectCount,

        fetchStatus:
          res.status,
      };
    }

    return {
      html: "",
      resolvedUrl:
        currentUrl,
      redirectCount,
      fetchStatus: 0,
    };
  } catch {
    return {
      html: "",
      resolvedUrl:
        currentUrl,
      redirectCount,
      fetchStatus: 0,
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

function getMetaTitle(
  source: string,
  attribute: "property" | "name",
  key: string
) {
  const escapedKey =
    key.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const firstMatch =
    source.match(
      new RegExp(
        `<meta[^>]+${attribute}=["']${escapedKey}["'][^>]+content=["']([^"']+)["']`,
        "i"
      )
    )?.[1];

  const reversedMatch =
    source.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${escapedKey}["']`,
        "i"
      )
    )?.[1];

  return decodeHtmlEntities(
    firstMatch ||
      reversedMatch ||
      ""
  );
}

function getTitle(html: string) {
  /*
   * Only inspect the document <head>.
   * SVGs, payment widgets and embedded components
   * can contain their own <title> tags inside <body>.
   */
  const head =
    String(html || "").match(
      /<head\b[^>]*>([\s\S]*?)<\/head>/i
    )?.[1] || "";

  const source =
    head || String(html || "");

  const candidates = [
    decodeHtmlEntities(
      source.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
      )?.[1] || ""
    ),

    getMetaTitle(
      source,
      "property",
      "og:title"
    ),

    getMetaTitle(
      source,
      "name",
      "twitter:title"
    ),
  ]
    .map((value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  const paymentOrWidgetTitle =
    /^(american express|visa|mastercard|paypal|shop pay|apple pay|google pay)$/i;

  return (
    candidates.find(
      (candidate) =>
        !paymentOrWidgetTitle.test(
          candidate
        )
    ) ||
    candidates[0] ||
    ""
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

function getBodyText(html: string) {
  return decodeHtmlEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function getImageAltStats(html: string) {
  const tags = String(html || "").match(/<img\b[^>]*>/gi) || [];

  let missingAttribute = 0;
  let emptyAlt = 0;
  let descriptiveAlt = 0;

  tags.forEach((tag) => {
    if (!/\balt\s*=/i.test(tag)) {
      missingAttribute += 1;
      return;
    }

    if (/\balt\s*=\s*(?:"\s*"|'\s*')/i.test(tag)) {
      emptyAlt += 1;
      return;
    }

    descriptiveAlt += 1;
  });

  return {
    imageCount: tags.length,
    descriptiveAlt,
    emptyAlt,
    missingAttribute,
  };
}

function compactPhrase(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function inferBusinessSeed(input: {
  bodyText: string;
  title: string;
  description: string;
  h1: string;
}) {
  const text = [
    input.title,
    input.description,
    input.h1,
    input.bodyText.slice(0, 12000),
  ]
    .join(" ")
    .toLowerCase();

  const candidates = [
    {
      seed: "creator subscription platforms",
      terms: [
        "creator subscription",
        "subscription content platform",
        "paid creator content",
        "exclusive creator content",
        "fan subscription platform",
        "fan club",
        "fanclub",
        "content creators",
        "creator monetization",
        "creator monetisation",
        "conteudos por assinatura",
        "conteúdos por assinatura",
        "produtores de conteudo",
        "produtores de conteúdo",
        "fotos videos audios e stories",
        "fotos vídeos áudios e stories",
        "apoie e fique ainda mais proximo",
        "apoie e fique ainda mais próximo",
      ],
    },
    {
      seed: "healthcare software development",
      terms: [
        "healthcare technology",
        "healthtech",
        "health tech",
        "medical device",
        "medical devices",
        "software as a medical device",
        "samd",
        "healthcare software",
        "healthcare app development",
        "medical software",
        "digital health",
        "ai healthcare",
        "healthcare ai",
        "xr solutions",
        "life sciences",
        "clinical software",
      ],
    },
    {
      seed: "custom software development",
      terms: [
        "custom software development",
        "software development company",
        "software development services",
        "application development",
        "app development",
        "web application development",
        "product development",
        "digital product development",
      ],
    },
    {
      seed: "digital marketing services",
      terms: [
        "digital marketing",
        "search engine optimization",
        "seo services",
        "ppc",
        "paid advertising",
        "social media marketing",
        "amazon marketing",
        "website development",
      ],
    },
    {
      seed: "business software",
      terms: [
        "saas",
        "business software",
        "software reviews",
        "crm software",
        "project management software",
      ],
    },
    {
      seed: "ecommerce services",
      terms: [
        "ecommerce",
        "online store",
        "shopify",
        "amazon seller",
      ],
    },
    {
      seed: "real estate services",
      terms: [
        "real estate",
        "property management",
        "realtor",
        "brokerage",
      ],
    },
    {
      seed: "legal services",
      terms: ["law firm", "lawyer", "attorney", "legal services"],
    },
    {
      seed: "healthcare services",
      terms: ["healthcare", "medical clinic", "doctor", "dental"],
    },
  ];

  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      score: candidate.terms.reduce(
        (total, term) => total + (text.includes(term) ? 1 : 0),
        0
      ),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].seed : "";
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
  titleNeedsContext: boolean;
  descriptionNeedsRewrite: boolean;
  h1NeedsContext: boolean;
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

  if (input.h1Count > 1) {
    issues.push({
      title: "Multiple H1 headings on homepage",
      severity: "medium",
      timeline: "0–30 days",
      impact:
        `${input.h1Count} H1 headings were detected on the resolved homepage, which weakens primary heading hierarchy.`,
      fix:
        "Keep one primary H1 and convert supporting top-level headings to H2 or H3 where appropriate.",
    });
  }

  if (input.titleNeedsContext) {
    issues.push({
      title: "Homepage title lacks descriptive service context",
      severity: "medium",
      timeline: "0–30 days",
      impact:
        "The title is present, but it is too short or too generic to communicate the page topic and search intent clearly.",
      fix:
        "Rewrite the title to approximately 50–60 characters and include the primary service or category.",
    });
  }

  if (input.descriptionNeedsRewrite) {
    issues.push({
      title: "Homepage meta description needs rewriting",
      severity: "high",
      timeline: "0–30 days",
      impact:
        "The description is too short, too long, generic, or appears to contain template copy that does not accurately describe the audited business.",
      fix:
        "Replace it with a unique 140–160 character description focused on the business offer and user intent.",
    });
  }

  if (input.h1NeedsContext) {
    issues.push({
      title: "Homepage H1 lacks service context",
      severity: "medium",
      timeline: "0–30 days",
      impact:
        "A brand-only H1 provides limited topical context for users, search engines, and answer engines.",
      fix:
        "Use one clear H1 that combines the brand with the primary service or value proposition.",
    });
  }

  if (input.imagesMissingAlt > 0) {
    issues.push({
      title: "Images missing alt attributes",
      severity: "medium",
      timeline: "0–30 days",
      impact: "Accessibility and image SEO signals are weaker.",
      fix: 'Add descriptive alt text to important images. Keep alt="" only for genuinely decorative images.',
    });
  }

  if (input.mobileScore > 0 && input.mobileScore < 60) {
    issues.push({
      title: "Low mobile performance",
      severity: "high",
      timeline: "0–30 days",
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
async function getCachedAuditReport(
  userId: string,
  inputHash: string
) {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const cached = await prisma.auditReport.findFirst({
    where: {
  userId,
  inputHash,
  status: {
    in: [
      "completed",
      "completed_with_limitation",
    ],
  },
  renderReady: true,
  createdAt: {
    gte: since,
  },
},
    orderBy: {
      createdAt: "desc",
    },
  });

  return cached || null;
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
  return withSecurityHeaders(
    NextResponse.json(
      {
        success: false,
        error:
          "Free audits are no longer available. Start a 7-day trial to run complete audits.",
      },
      {
        status: 410,
      }
    )
  );
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
 * Legacy unauthenticated requests receive a temporary identity
 * based on the trusted client IP.
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
    auditConfig:
      body?.auditConfig || body,
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
  auditConfig,
  inputHash,
} = auditIdentity;

const locationCode =
  auditConfig.locationCode;
const locationName =
  auditConfig.countryName;
const languageName =
  auditConfig.languageName;
const languageCode =
  auditConfig.languageCode;
const selectedDevice =
  auditConfig.device;
const searchEngine =
  auditConfig.searchEngine;
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
    !sameReportTypes ||
    getAuditScopeKey(
      auditJob.auditConfig || {},
      domain
    ) !==
      getAuditScopeKey(
        auditConfig,
        domain
      );

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
    auditConfig: {
      ...auditConfig,
    },
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
      auditConfig: {
        ...auditConfig,
      },
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
        inputHash
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
    const redirectCount =
      Number(htmlResult.redirectCount || 0);
    const canonicalUrl = getCanonicalUrl(html, resolvedUrl);
    const auditTargetUrl = canonicalUrl || resolvedUrl || url;
    const title = getTitle(html);
    const description = getDescription(html);

    const isPakistanDomain =
      auditConfig.countryCode === "PK" ||
      domain.endsWith(".pk") ||
      description.toLowerCase().includes("pakistan") ||
      title.toLowerCase().includes("pakistan");

    const cleanSeedKeyword =
      title?.replace(/[-|–].*$/, "").trim() ||
      description?.split(".")?.[0] ||
      domain.replace(/\.(com|co|net|org|io|pk|us)$/i, "");

const h1Count = countMatches(
  html,
  /<h1[\s>]/gi
);

const h1 = getFirstH1(html);
const bodyText = getBodyText(html);

const businessContext =
  await resolveBusinessContext({
    html,
    title,
    description,
    h1,
    bodyText,
    domain,

    countryName:
      locationName,

    countryCode:
      auditConfig.countryCode,

    languageName,
    languageCode,
  });

const brandNameForAudit =
  businessContext.brandName;
    const bodyWordCount = bodyText
      .split(" ")
      .map((word) => word.trim())
      .filter(Boolean).length;

    const imageAltStats = getImageAltStats(html);
    const imageCount = imageAltStats.imageCount;
    const imagesWithAlt = imageAltStats.descriptiveAlt;
    const imagesEmptyAlt = imageAltStats.emptyAlt;
    const imagesMissingAlt = imageAltStats.missingAttribute;

    const titleLength = title.trim().length;
    const descriptionLength = description.trim().length;
    const normalizedBrand = compactPhrase(brandNameForAudit);
    const normalizedH1 = compactPhrase(h1);

    const titleNeedsContext = Boolean(
      title && (titleLength < 30 || titleLength > 65)
    );

    const descriptionNeedsRewrite = Boolean(
      description &&
        (descriptionLength < 120 ||
          descriptionLength > 170 ||
          /webflow template|website template|theme demo|template created|placeholder copy/i.test(
            description
          ))
    );

    const h1NeedsContext = Boolean(
      h1 &&
        normalizedH1 &&
        normalizedBrand &&
        (normalizedH1 === normalizedBrand || h1.trim().length < 20)
    );

    const inferredServiceSeed =
      businessContext.primaryService;

    const inferredBusinessIndustry =
      businessContext.categoryLabel;

    const inferredCategoryKeywords =
      businessContext.categoryKeywords;

    // ── AI CITATION READINESS — computed from the same HTML fetch above ──

    const ldJsonBlocks =
      html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    const hasSchema = ldJsonBlocks.length > 0;
    const hasFaqSchema = ldJsonBlocks.some((b) => /FAQPage/i.test(b));

    const geoFactors = [
      {
        label: "Has one clear H1 heading",
        weight: 15,
        assessed: true,
        pass:
          h1Count === 1 &&
          !h1NeedsContext,
        note:
          h1Count === 0
            ? "No H1 was detected on the resolved homepage."
            : h1Count > 1
              ? `${h1Count} H1 headings were detected; use one primary H1.`
              : h1NeedsContext
                ? "The H1 is present but does not provide enough service or topical context."
                : "One clear, descriptive H1 was detected.",
      },
      {
        label: "Has a meta description",
        weight: 10,
        assessed: true,
        pass: Boolean(description.trim()),
      },
      {
        label: "Content depth (300+ words)",
        weight: 20,
        assessed: true,
        pass: bodyWordCount >= 300,
      },
      {
        label: "In-depth content (800+ words)",
        weight: 10,
        assessed: true,
        pass: bodyWordCount >= 800,
      },
      {
        label: "Has structured data (schema)",
        weight: 20,
        assessed: true,
        pass: hasSchema,
      },
      {
        label: "Has FAQ schema (FAQPage)",
        weight: 15,
        assessed: true,
        pass: hasFaqSchema,
      },
      {
        label: "Image ALT coverage",
        weight: 10,
        assessed: imageCount > 0,
        pass:
          imageCount > 0
            ? imagesMissingAlt === 0
            : null,
        note:
          imageCount > 0
            ? `${imagesWithAlt} descriptive ALT value(s), ${imagesMissingAlt} missing ALT attribute(s).`
            : "No server-rendered images were detected, so ALT coverage was not assessed.",
      },
    ];

    const pageGeoScore = geoFactors.reduce(
      (score, factor) =>
        score +
        (factor.assessed !== false &&
        factor.pass === true
          ? factor.weight
          : 0),
      0
    );

    const pageGeoGrade =
      pageGeoScore >= 75
        ? "Strong"
        : pageGeoScore >= 45
          ? "Moderate"
          : "Needs Work";

    const pageGeoTopIssue =
      geoFactors
        .filter(
          (factor) =>
            factor.assessed !== false &&
            factor.pass !== true
        )
        .sort(
          (a, b) => b.weight - a.weight
        )[0]?.label || null;
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

const [
  mobileSpeed,
  desktopSpeed,
] = await Promise.all([
  getPageSpeed(
    auditTargetUrl,
    "mobile"
  ),

  getPageSpeed(
    auditTargetUrl,
    "desktop"
  ),
]);

const hasPageSpeedEvidence = (snapshot: any) =>
  Boolean(
    snapshot &&
      (
        Number(snapshot?.score || 0) > 0 ||
        [
          snapshot?.lcp,
          snapshot?.fcp,
          snapshot?.cls,
          snapshot?.tbt,
          snapshot?.speedIndex,
        ].some(
          (value) =>
            value !== null &&
            value !== undefined &&
            !["", "--", "—", "n/a"].includes(
              String(value).trim().toLowerCase()
            )
        )
      )
  );

    const tabletScore =
      mobileSpeed.score && desktopSpeed.score
        ? Math.round((mobileSpeed.score + desktopSpeed.score) / 2)
        : 0;

    const selectedPageSpeed =
      selectedDevice === "desktop"
        ? desktopSpeed
        : mobileSpeed;

    const fallbackPageSpeed =
      selectedDevice === "desktop"
        ? mobileSpeed
        : desktopSpeed;

    const primaryPageSpeed =
      hasPageSpeedEvidence(selectedPageSpeed)
        ? selectedPageSpeed
        : hasPageSpeedEvidence(fallbackPageSpeed)
          ? fallbackPageSpeed
          : selectedPageSpeed;

    const primaryPerformanceDevice =
      hasPageSpeedEvidence(selectedPageSpeed)
        ? selectedDevice
        : hasPageSpeedEvidence(fallbackPageSpeed)
          ? selectedDevice === "desktop"
            ? "mobile"
            : "desktop"
          : selectedDevice;

    const performanceFallbackUsed =
      primaryPerformanceDevice !== selectedDevice;

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


if (
  runTraffic ||
  runCompetitors ||
  runBacklinks ||
  runKeywordResearch
) {
  try {
    const dfsRes = await fetch(
      `${origin}/api/dataforseo`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          url,
          locationName,
          languageName,
          languageCode,
          locationCode,
          device: selectedDevice,
          searchEngine,

businessSeed:
  businessContext.searchSeed ||
  businessContext.primaryService,

          businessContext,

          siteContext: {
            title,
            description,
            h1,
          },
        }),

        cache: "no-store",
      }
    );

    const dfsJson =
      await dfsRes.json();

    dataforseo =
      dfsJson?.dataforseo || null;

    /*
     * Canonical relevance gate:
     * prevent broad/unrelated keyword gaps
     * from reaching recommendations.
     */
    if (
      dataforseo?.keywordGap &&
      Array.isArray(
        dataforseo.keywordGap
          .missingKeywords
      )
    ) {
      const rawMissingKeywords =
        dataforseo.keywordGap
          .missingKeywords;

      const relevantMissingKeywords =
        filterRelevantKeywordItems(
          rawMissingKeywords,
          businessContext,
          {
            minimumScore: 4,
            dedupe: true,
          }
        );

      const relevantKeywordSet = new Set(
        relevantMissingKeywords
          .map((item: any) =>
            String(item?.keyword || "")
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
      );

      const relevantContentIdeas = Array.isArray(
        dataforseo.keywordGap?.contentIdeas
      )
        ? dataforseo.keywordGap.contentIdeas
            .map((idea: any) => {
              const keywords = Array.isArray(
                idea?.keywords
              )
                ? idea.keywords.filter(
                    (item: any) =>
                      relevantKeywordSet.has(
                        String(
                          item?.keyword || ""
                        )
                          .trim()
                          .toLowerCase()
                      )
                  )
                : [];

              if (keywords.length === 0) {
                return null;
              }

              return {
                ...idea,
                headline: keywords?.[0]?.keyword
                  ? `Create content targeting "${keywords[0].keyword}"`
                  : idea?.headline,
                keywords,
              };
            })
            .filter(Boolean)
        : [];

      const relevantKeywordClusters =
        dataforseo.keywordGap?.keywordClusters &&
        typeof dataforseo.keywordGap.keywordClusters === "object"
          ? Object.fromEntries(
              Object.entries(
                dataforseo.keywordGap.keywordClusters
              )
                .map(([cluster, items]: any) => [
                  cluster,
                  Array.isArray(items)
                    ? items.filter((item: any) =>
                        relevantKeywordSet.has(
                          String(
                            item?.keyword || ""
                          )
                            .trim()
                            .toLowerCase()
                        )
                      )
                    : [],
                ])
                .filter(
                  ([, items]: any) =>
                    Array.isArray(items) &&
                    items.length > 0
                )
            )
          : {};

      dataforseo = {
        ...dataforseo,

        keywordGap: {
          ...dataforseo.keywordGap,

          missingKeywords:
            relevantMissingKeywords,

          opportunities:
            relevantMissingKeywords.slice(0, 10),

          keywordClusters:
            relevantKeywordClusters,

          contentIdeas:
            relevantContentIdeas,

          relevanceFilteredCount:
            Math.max(
              0,
              rawMissingKeywords.length -
                relevantMissingKeywords.length
            ),

          relevanceGuardApplied: true,
        },
      };
    }
  } catch (error) {
    console.error(
      "DataForSEO inside audit failed:",
      error
    );

    moduleStatus.dataforseo =
      "not_available";
  }
}

const keywordResearchSeedMap: Record<string, string> = {
  saas: "business software",
  software_development: "custom software development",
  healthcare_technology: "healthcare software development",
  creator_platform: "creator subscription platforms",
  ecommerce: "online shopping products",
  real_estate: "real estate services",
  legal: "legal services",
  healthcare: "healthcare services",
  restaurant: "restaurant services",
  local_service: "local professional services",
  general: inferredServiceSeed || cleanSeedKeyword,
};

const blockedResearchSeedTerms =
  /crossword|movie|song|youtube|tiktok|reddit|birthday|cemetery|olive|archive|download|github|jobs|careers|contact number|quiz|worksheet|definition answer/i;

const brandAliasValues = Array.from(
  new Set(
    [
      domain.split(".")[0],
      brandNameForAudit,
      title?.split(/[|–—-]/)[0],
    ]
      .map((value) => compactPhrase(String(value || "")))
      .filter((value) => value.length >= 4)
  )
);

const isLikelyBrandedKeyword = (value: any) => {
  const compactKeyword = compactPhrase(String(value || ""));

  if (!compactKeyword) return false;

  return brandAliasValues.some((alias) => {
    if (compactKeyword === alias) return true;
    if (alias.length >= 6 && compactKeyword.includes(alias)) return true;
    if (compactKeyword.length >= 5 && alias.includes(compactKeyword)) return true;
    return false;
  });
};

const validatedGapSeed =
  (dataforseo?.keywordGap?.missingKeywords || [])
    .filter((item: any) => {
      const keyword = String(item?.keyword || "").trim();
      const volume = Number(
        item?.volume || item?.search_volume || 0
      );

      return (
        keyword.length >= 4 &&
        volume >= 20 &&
        !blockedResearchSeedTerms.test(keyword) &&
        !isLikelyBrandedKeyword(keyword)
      );
    })
    .sort(
      (a: any, b: any) =>
        Number(b?.opportunityScore || 0) -
          Number(a?.opportunityScore || 0) ||
        Number(b?.volume || b?.search_volume || 0) -
          Number(a?.volume || a?.search_volume || 0)
    )[0]?.keyword;

const validatedRankingSeed =
  (dataforseo?.topKeywords || []).find(
    (item: any) => {
      const keyword = String(item?.keyword || "").trim();
      const position = Number(item?.position || 999);
      const volume = Number(item?.volume || 0);

      return (
        keyword.length >= 4 &&
        position <= 50 &&
        volume >= 20 &&
        item?.branded !== true &&
        !isLikelyBrandedKeyword(keyword) &&
        !blockedResearchSeedTerms.test(keyword)
      );
    }
  )?.keyword;

const detectedNicheKey = String(
  dataforseo?.detectedNiche || "general"
);

const detectedNicheSeed =
  detectedNicheKey !== "general"
    ? keywordResearchSeedMap[detectedNicheKey]
    : "";

const keywordResearchSeed =
  businessContext.primaryService;

    if (runSERP) {
try {
const relevantExistingRankingKeywords =
  (dataforseo?.topKeywords || [])
    .filter((item: any) => {
      const keyword = String(
        item?.keyword || ""
      ).trim();

      return (
        keyword.length >= 4 &&
        item?.branded !== true &&
        !isLikelyBrandedKeyword(keyword) &&
        !blockedResearchSeedTerms.test(
          keyword
        ) &&
        isKeywordRelevantToBusiness(
          keyword,
          businessContext
        )
      );
    })
    .map((item: any) =>
      String(
        item?.keyword || ""
      ).trim()
    )
    .filter(Boolean)
    .slice(0, 2);

const serpKeywords = Array.from(
  new Set([
    ...businessContext.serpKeywords.slice(
      0,
      3
    ),

    ...relevantExistingRankingKeywords,
  ])
).slice(0, 5);

      const serpRes = await fetch(`${origin}/api/dataforseo/serp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          keywords: serpKeywords,
          locationName,
          languageName,
          languageCode,
          locationCode,
          device: selectedDevice,
          searchEngine,
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
        const rankedCategoryKeywords = (
          dataforseo?.topKeywords || []
        )
          .filter(
            (keyword: any) =>
              keyword?.branded !== true &&
              !isLikelyBrandedKeyword(
                keyword?.keyword
              ) &&
              !blockedResearchSeedTerms.test(
                String(keyword?.keyword || "")
              )
          )
          .map((keyword: any) =>
            String(
              keyword?.keyword || ""
            ).trim()
          )
          .filter(Boolean);

const categoryKeywords =
  businessContext.categoryKeywords.slice(
    0,
    8
  );

const aiIndustry =
  businessContext.primaryService;

const controller =
  new AbortController();

/*
 * AI is an independent module. If it exceeds
 * the safe time budget, return the remaining
 * completed audit rather than losing the
 * entire report to a gateway timeout.
 */
const timeout = setTimeout(
  () => controller.abort(),
  75000
);

let aiResponse: Response;

try {
  aiResponse = await fetch(
    `${origin}/api/ai-visibility`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
            url: auditTargetUrl,
            domain,
            brandName:
              businessContext.brandName,
            industry:
              businessContext.primaryService,
            categoryKeywords:
              businessContext.categoryKeywords,
            categoryContext:
              businessContext.categoryLabel,
categorySource:
  "canonical-business-context",
            businessContext,
            pageTitle: title,
            metaDescription: description,
            pageH1: h1,
            country: locationName,
            countryCode:
              auditConfig.countryCode,
            locationName,
            locationCode,
            languageName,
            languageCode,
            device: selectedDevice,
            searchEngine,
            auditConfig,
            competitors: (dataforseo?.competitors || []).map(
              (competitor: any) => competitor.domain
            ),
            customPrompts,
           }),
      signal: controller.signal,
      cache: "no-store",
    }
  );
} finally {
  clearTimeout(timeout);
}

const aiJson =
  await aiResponse.json();

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

const requestedCrawlPageLimit =
  auditConfig.maxCrawlPages;

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
            auditConfig,

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
            languageCode,
            locationCode,
            device: selectedDevice,
            searchEngine,
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
seedKeyword:
  businessContext.searchSeed ||
  businessContext.primaryService,

keyword:
  businessContext.searchSeed ||
  businessContext.primaryService,
  brandName:
    businessContext.brandName,
  domain,
  businessContext,
  locationName,
  languageName,
  languageCode,
  locationCode,
  device: selectedDevice,
  searchEngine,
}),
          cache: "no-store",
        }
      );

      const keywordResearchJson = await keywordResearchRes.json();
      keywordResearch = keywordResearchJson?.keywordResearch || null;

      if (keywordResearch && Array.isArray(keywordResearch.suggestions)) {
        keywordResearch = {
          ...keywordResearch,
          seedKeyword: keywordResearchSeed,
          displayMode: "opportunities",
          suggestions: keywordResearch.suggestions.filter((item: any) => {
            const keyword = String(item?.keyword || "").trim();

            return (
              keyword.length >= 4 &&
              !blockedResearchSeedTerms.test(keyword) &&
              !isLikelyBrandedKeyword(keyword) &&
              isKeywordRelevantToBusiness(
                keyword,
                businessContext
              )
            );
          }),
        };
      }
  } catch (error) {
  console.error("Keyword Research inside audit failed:", error);

  moduleStatus.keywordResearch = "not_available";
}
}
    if (
  (!keywordResearch?.suggestions || keywordResearch.suggestions.length === 0) &&
  dataforseo?.topKeywords?.length > 0
) {
  const fallbackKeywords = dataforseo.topKeywords
    .filter((k: any) => {
      const keyword = String(k?.keyword || "").trim();

      return (
        keyword.length >= 4 &&
        k?.branded !== true &&
        !isLikelyBrandedKeyword(keyword) &&
        !blockedResearchSeedTerms.test(keyword) &&
        isKeywordRelevantToBusiness(
          keyword,
          businessContext
        )
      );
    })
    .map((k: any) => ({
      keyword: k.keyword,
      volume: k.volume,
      cpc: k.cpc,
      competition: k.competition || null,
      position: k.position,
      url: k.url,
      intent: k.intent || null,
      difficulty: k.difficulty || null,
    }));

  keywordResearch = {
    seedKeyword: keywordResearchSeed,
    suggestions: fallbackKeywords,
    displayMode: "ranking-evidence",
    source: fallbackKeywords.length
      ? "Validated current ranking evidence"
      : "Insufficient non-branded keyword evidence",
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
              Math.max(1, auditConfig.contentPageLimit)
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

      if (contentAnalysis && Array.isArray(contentAnalysis.results)) {
        const normalizePageUrl = (value: any) => {
          try {
            const parsed = new URL(String(value || ""));
            return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "") || "/"}`;
          } catch {
            return String(value || "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
          }
        };

        const auditedPageKey = normalizePageUrl(auditTargetUrl);

        const normalizedResults = contentAnalysis.results.map((item: any) => {
          if (normalizePageUrl(item?.url) !== auditedPageKey) {
            return item;
          }

          const originalIssues = Array.isArray(item?.issues) ? item.issues : [];
          const hadAltIssue = originalIssues.some((issue: any) =>
            /image\(s\).*missing alt|missing alt text/i.test(String(issue || ""))
          );
          const filteredIssues = originalIssues.filter(
            (issue: any) =>
              !/image\(s\).*missing alt|missing alt text/i.test(String(issue || ""))
          );

          if (imagesMissingAlt > 0) {
            filteredIssues.unshift(
              `${imagesMissingAlt} image(s) missing an ALT attribute`
            );
          }

const baseAdjustedScore =
  hadAltIssue &&
  imagesMissingAlt === 0 &&
  Number.isFinite(Number(item?.score))
    ? Math.min(
        100,
        Number(item.score) + 15
      )
    : item?.score;

const hasMultipleH1Issue =
  filteredIssues.some(
    (issue: any) =>
      /multiple h1/i.test(
        String(issue || "")
      )
  );

const adjustedScore =
  hasMultipleH1Issue &&
  Number.isFinite(
    Number(baseAdjustedScore)
  )
    ? Math.min(
        85,
        Number(baseAdjustedScore)
      )
    : baseAdjustedScore;

          return {
            ...item,
            score: adjustedScore,
            issues: filteredIssues,
          };
        });

        const scoredResults = normalizedResults
          .map((item: any) => Number(item?.score))
          .filter((score: number) => Number.isFinite(score));

        contentAnalysis = {
          ...contentAnalysis,
          results: normalizedResults,
          averageScore: scoredResults.length
            ? Math.round(
                scoredResults.reduce((sum: number, score: number) => sum + score, 0) /
                  scoredResults.length
              )
            : contentAnalysis.averageScore,
        };
      }

      const analyzedContentPages = Number(
        contentAnalysis?.analyzedPages ||
          contentAnalysis?.results?.length ||
          0
      );

      if (contentAnalysis && analyzedContentPages === 0) {
        contentAnalysis = {
          ...contentAnalysis,
          analyzedPages: 0,
          failedPages: Math.max(
            1,
            Number(
              contentAnalysis?.failedPages ||
                contentAnalysis?.requestedPages ||
                1
            )
          ),
          averageScore: null,
          unavailableReason:
            contentAnalysis?.unavailableReason ||
            "The selected first-party page could not be analyzed during this run. No content-quality score or content-derived recommendation has been generated.",
          note:
            contentAnalysis?.note ||
            "The selected first-party page could not be analyzed during this run. No content-quality score or content-derived recommendation has been generated.",
          results: [],
        };
      }
    } catch (error) {
  console.error("Content Analysis inside audit failed:", error);

  contentAnalysis = {
    requestedPages: Math.min(
      20,
      Math.max(
        1,
        auditConfig.contentPageLimit
      )
    ),
    analyzedPages: 0,
    failedPages: 1,
    averageScore: null,
    scope: "first-party",
    results: [],
    unavailableReason:
      "The selected first-party page could not be analyzed during this run. No content-quality score or content-derived recommendation has been generated.",
    note:
      "The selected first-party page could not be analyzed during this run. No content-quality score or content-derived recommendation has been generated.",
  };

  moduleStatus.contentAnalysis = "not_available";
}
}

if (runLocal) {
  if (
    businessContext
      .localSeoApplicable ===
    false
  ) {
    businessData = {
      applicable: false,

      status:
        "not_applicable",

      reason:
        "Local SEO is not a primary fit for this website type.",

      note:
        "This website primarily operates as an online publication, software product, platform, marketplace, ecommerce property, or other non-location-dependent website.",

      keyword: null,

      location:
        locationName,

      listings: [],
    };

    moduleStatus.businessData =
      "not_applicable";
  } else {
    try {
      const businessRes =
        await fetch(
          `${origin}/api/dataforseo/business-data`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                url:
                  auditTargetUrl,

                domain,

                brandName:
                  businessContext.brandName,

                serviceKeyword:
                  businessContext.localQueryService,

                businessContext,

                locationName,

                languageName,

                languageCode,

                locationCode,

                auditConfig,
              }),

            cache:
              "no-store",
          }
        );

      const businessJson =
        await businessRes.json();

      businessData =
        businessJson
          ?.businessData ||
        null;
    } catch (error) {
      console.error(
        "Business Data inside audit failed:",
        error
      );
    }
  }
}

    const normalizeAuditUrl = (
      value: any
    ) => {
      try {
        const parsed = new URL(
          String(value || "")
        );

        return `${parsed.hostname
          .replace(/^www\./, "")
          .toLowerCase()}${parsed.pathname
          .replace(/\/+$/, "") || "/"}`;
      } catch {
        return String(value || "")
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "")
          .replace(/[?#].*$/, "")
          .replace(/\/+$/, "")
          .toLowerCase();
      }
    };

    const homepageAuditKeys = new Set(
      [
        auditTargetUrl,
        canonicalUrl,
        resolvedUrl,
        url,
      ]
        .map(normalizeAuditUrl)
        .filter(Boolean)
    );

    const homepageContentResult =
      (
        Array.isArray(
          contentAnalysis?.results
        )
          ? contentAnalysis.results
          : []
      ).find((item: any) =>
        homepageAuditKeys.has(
          normalizeAuditUrl(
            item?.url
          )
        )
      ) || null;

    const homepageContentHasMultipleH1 =
      Array.isArray(
        homepageContentResult?.issues
      ) &&
      homepageContentResult.issues.some(
        (issue: any) =>
          /multiple h1/i.test(
            String(issue || "")
          )
      );

    if (
      homepageContentHasMultipleH1
    ) {
      const h1Factor =
        pageGeoReadiness.factors.find(
          (factor: any) =>
            /h1 heading/i.test(
              String(
                factor?.label || ""
              )
            )
        );

      if (h1Factor) {
        h1Factor.pass = false;
        h1Factor.note =
          "Multiple H1 headings were detected on the audited homepage by the first-party content analysis.";
      }

      pageGeoReadiness.score =
        pageGeoReadiness.factors.reduce(
          (
            score: number,
            factor: any
          ) =>
            score +
            (
              factor?.assessed !==
                false &&
              factor?.pass === true
                ? Number(
                    factor?.weight || 0
                  )
                : 0
            ),
          0
        );

      pageGeoReadiness.grade =
        pageGeoReadiness.score >= 75
          ? "Strong"
          : pageGeoReadiness.score >= 45
            ? "Moderate"
            : "Needs Work";

      pageGeoReadiness.topIssue =
        pageGeoReadiness.factors
          .filter(
            (factor: any) =>
              factor?.assessed !==
                false &&
              factor?.pass !== true
          )
          .sort(
            (a: any, b: any) =>
              Number(
                b?.weight || 0
              ) -
              Number(
                a?.weight || 0
              )
          )[0]?.label || null;
    }

    const seoScore = Math.max(
      0,
      Math.min(
        100,
        100 -
          (!title ? 15 : 0) -
          (!description ? 15 : 0) -
          (h1Count === 0 ? 15 : 0) -
          (titleNeedsContext ? 8 : 0) -
          (descriptionNeedsRewrite ? 12 : 0) -
          (h1NeedsContext ? 5 : 0) -
          (
            h1Count > 1 ||
            homepageContentHasMultipleH1
              ? 8
              : 0
          ) -
          (imagesMissingAlt > 0 ? 10 : 0)
      )
    );

    const uxScore = Math.max(
      0,
      Math.min(
        100,
        95 -
          (primaryPageSpeed.score > 0 && primaryPageSpeed.score < 60
            ? 20
            : primaryPageSpeed.score > 0 && primaryPageSpeed.score < 75
              ? 10
              : 0) -
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

const dfsTraffic = Number(
  dataforseo?.organicTraffic || 0
);

const rankedKeywordTraffic = Math.round(
  (
    Array.isArray(
      dataforseo?.trafficDebug
    )
      ? dataforseo.trafficDebug
      : Array.isArray(
            dataforseo?.topKeywords
          )
        ? dataforseo.topKeywords
        : []
  ).reduce(
    (total: number, item: any) =>
      total +
      Number(
        item?.estimatedVisits ??
          item?.traffic ??
          item?.estimatedTraffic ??
          0
      ),
    0
  )
);

const domainAnalyticsTrafficSignal =
  Math.round(
    Number(
      domainAnalytics?.organicTrafficSignal ??
        domainAnalytics?.organicTraffic ??
        0
    )
  );

const rawOrganicTraffic =
  dfsTraffic > 0
    ? Math.round(dfsTraffic)
    : rankedKeywordTraffic > 0
      ? rankedKeywordTraffic
      : domainAnalyticsTrafficSignal > 0
        ? domainAnalyticsTrafficSignal
        : 0;

let organicTraffic: number | null =
  rawOrganicTraffic > 0
    ? rawOrganicTraffic
    : null;

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

const trafficSource =
  dfsTraffic > 0
    ? dataforseo?.trafficMethod ||
      "provider-organic-traffic"
    : rankedKeywordTraffic > 0
      ? "ranked-keyword-ctr-sum"
      : domainAnalyticsTrafficSignal > 0
        ? "domain-analytics-fallback"
        : dataforseo?.trafficMethod ||
          "insufficient-data";

const trafficConfidence =
  dataforseo?.trafficConfidence ||
  (
    organicTraffic &&
    Number(
      dataforseo?.organicKeywords ||
        dataforseo?.rankedKeywordCount ||
        0
    ) >= 50
      ? "moderate"
      : "insufficient-data"
  );

const trafficScore = organicTraffic
  ? Math.min(100, Math.round(organicTraffic / 50))
  : 0;

    const keywordGapPenalty =
      dataforseo?.keywordGap?.missingKeywords?.length || 0;

    const gapScore = Math.max(0, 100 - keywordGapPenalty * 3);

const referringDomainCount = Number(
  dataforseo?.backlinks?.referringDomains || 0
);

const sampledBacklinks = Array.isArray(
  dataforseo?.backlinks?.topBacklinks
)
  ? dataforseo.backlinks.topBacklinks
  : [];

const lowQualityBacklinkPattern =
  /forum|profile|directory|classified|bookmark|guestbook|stream&type=|\/(?:users?|members?|profiles?|tags?|likes?|posts?|evaluate|listings?)(?:\/|$)|(?:^|[\s./_-])(?:social|feedback|directory|listing)(?:[.\s/_-]|$)/i;

const sampledLowQualityBacklinks =
  sampledBacklinks.filter((item: any) =>
    lowQualityBacklinkPattern.test(
      [
        item?.domainFrom,
        item?.sourceUrl,
      ]
        .filter(Boolean)
        .join(" ")
    )
  ).length;

const sampledQualityRatio =
  sampledBacklinks.length > 0
    ? Math.max(
        0,
        1 -
          sampledLowQualityBacklinks /
            sampledBacklinks.length
      )
    : null;

const backlinkTypeTotal =
  Number(
    dataforseo?.backlinks?.dofollow || 0
  ) +
  Number(
    dataforseo?.backlinks?.nofollow || 0
  );

const dofollowRatio =
  backlinkTypeTotal > 0
    ? Number(
        dataforseo?.backlinks?.dofollow ||
          0
      ) / backlinkTypeTotal
    : null;

const referringDomainBreadthScore =
  referringDomainCount >= 1000
    ? 65
    : referringDomainCount >= 500
      ? 60
      : referringDomainCount >= 200
        ? 55
        : referringDomainCount >= 100
          ? 48
          : referringDomainCount >= 50
            ? 40
            : referringDomainCount >= 20
              ? 32
              : referringDomainCount >= 5
                ? 20
                : referringDomainCount >= 1
                  ? 10
                  : 0;

const sampleQualityScore =
  sampledQualityRatio === null
    ? 10
    : Math.round(sampledQualityRatio * 20);

const dofollowQualityScore =
  dofollowRatio === null
    ? 8
    : Math.round(
        Math.min(
          1,
          Math.max(0, dofollowRatio)
        ) * 15
      );

const backlinkScore = Math.min(
  100,
  referringDomainBreadthScore +
    sampleQualityScore +
    dofollowQualityScore
);

const backlinkAuthoritySignals = {
  referringDomains:
    referringDomainCount,
  sampledBacklinks:
    sampledBacklinks.length,
  sampledLowQualityBacklinks,
  sampledQualityRatio:
    sampledQualityRatio === null
      ? null
      : Number(
          sampledQualityRatio.toFixed(2)
        ),
  dofollowRatio:
    dofollowRatio === null
      ? null
      : Number(dofollowRatio.toFixed(2)),
  methodology:
    "Authority score combines referring-domain breadth with sampled source-pattern heuristics and link-type signals. The sample screen is directional and does not certify backlink quality or editorial relevance.",
};

const organicTrafficForScore = Number(organicTraffic || 0);

const trafficHealthScore =
  organicTrafficForScore > 5000
    ? 85
    : organicTrafficForScore > 1000
    ? 65
    : organicTrafficForScore > 100
    ? 45
    : 20;

const overallScoreParts = [
  {
    value: seoScore,
    weight: 0.3,
    available: runSEO,
  },
  {
    value: uxScore,
    weight: 0.15,
    available:
      runSEO || runTechnical,
  },
  {
    value: Number(
      primaryPageSpeed?.score || 0
    ),
    weight: 0.25,
    available:
      runTechnical &&
      hasPageSpeedEvidence(
        primaryPageSpeed
      ),
  },
  {
    value: backlinkScore,
    weight: 0.15,
    available:
      runBacklinks &&
      Boolean(
        dataforseo?.backlinks
      ),
  },
  {
    value: aiVisibilityScore,
    weight: 0.15,
    available:
      runAI &&
      Boolean(aiSearchVisibility),
  },
].filter(
  (part) => part.available
);

const overallScoreWeight =
  overallScoreParts.reduce(
    (sum, part) =>
      sum + part.weight,
    0
  );

const overallScore =
  overallScoreWeight > 0
    ? Math.round(
        overallScoreParts.reduce(
          (sum, part) =>
            sum +
            Number(part.value || 0) *
              part.weight,
          0
        ) /
          overallScoreWeight
      )
    : 0;

    const issues = buildIssues({
      title,
      description,
      h1Count,
      imageCount,
      imagesMissingAlt,
      mobileScore: mobileSpeed.score,
      titleNeedsContext,
      descriptionNeedsRewrite,
      h1NeedsContext,
    });

    if (
      homepageContentHasMultipleH1 &&
      h1Count <= 1
    ) {
      issues.push({
        title:
          "Multiple H1 headings on homepage",
        severity: "medium",
        timeline: "0–30 days",
        impact:
          "First-party content analysis detected multiple H1 headings on the audited homepage.",
        fix:
          "Keep one primary H1 and convert supporting top-level headings to H2 or H3 where appropriate.",
      });
    }

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
            seedKeyword:
              businessContext.primaryService,
            businessContext,
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
            businessType:
              inferredBusinessIndustry ||
              (
                detectedNicheKey !== "general"
                  ? detectedNicheKey
                  : "general"
              ),
            detectedNiche:
              inferredBusinessIndustry ||
              (
                detectedNicheKey !== "general"
                  ? detectedNicheKey
                  : "general"
              ),
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

  const normalizedRecommendation = {
    ...recommendation,
  };

  const recommendationBusinessContext =
    String(
      businessContext.categoryKey ||
        businessContext.categoryLabel ||
        inferredBusinessIndustry ||
        detectedNicheKey ||
        "general"
    ).toLowerCase();

  if (
    recommendationBusinessContext !==
      "ecommerce" &&
    /keyword/i.test(
      String(
        normalizedRecommendation
          ?.sourceModule || ""
      )
    )
  ) {
    const replacePageType = (
      value: any
    ) =>
      String(value || "")
        .replace(
          /product\s*\/\s*collection page/gi,
          "service / solution page"
        )
        .replace(
          /product page/gi,
          "service page"
        )
        .replace(
          /collection page/gi,
          "solution page"
        );

    normalizedRecommendation.title =
      replacePageType(
        normalizedRecommendation.title
      );

    normalizedRecommendation.detail =
      replacePageType(
        normalizedRecommendation.detail
      );
  }

  /*
   * Publications and editorial review
   * sites must not receive SaaS-vendor
   * page-type recommendations.
   */
  if (
    businessContext.marketRole ===
      "publication" &&
    /keyword/i.test(
      String(
        normalizedRecommendation
          ?.sourceModule || ""
      )
    )
  ) {
    const adaptPublicationPageType =
      (value: any) =>
        String(value || "")
          .replace(
            /feature\s*\/\s*solution page/gi,
            "comparison / review page"
          )
          .replace(
            /service\s*\/\s*solution page/gi,
            "comparison / review page"
          )
          .replace(
            /commercial landing page/gi,
            "editorial roundup / buying guide"
          )
          .replace(
            /solution page/gi,
            "review page"
          );

    normalizedRecommendation.title =
      adaptPublicationPageType(
        normalizedRecommendation.title
      );

    normalizedRecommendation.detail =
      adaptPublicationPageType(
        normalizedRecommendation.detail
      );
  }

  return normalizedRecommendation;
};

const foundationRecommendations: any[] = [];
const foundationKeys = new Set<string>();

const addFoundationRecommendation = (item: any) => {
  const key = String(item?.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!key || foundationKeys.has(key)) {
    return;
  }

  foundationKeys.add(key);
  foundationRecommendations.push(item);
};

if (runRecommendations || runAI) {
  (issues || []).forEach((issue: any) => {
    const issueText = [
      issue?.title,
      issue?.impact,
      issue?.fix,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/alt text|missing alt/.test(issueText)) {
      addFoundationRecommendation({
        id: "foundation-alt-text",
        title: "Add descriptive ALT text to important images",
        detail:
          "Add concise, descriptive ALT text to every important image that is currently missing it. Validate the homepage first, then the remaining audited pages.",
        sourceModule: "SEO Foundation",
        impact: "Medium",
        effort: "Low",
        owner: "SEO / Content",
        timeline: "0–30 days",
        expectedImpact:
          "Improve accessibility, image understanding, and AI citation readiness.",
        affectedUrls: [auditTargetUrl],
        evidence: [
          `Images missing ALT text: ${imagesMissingAlt}`,
        ],
        validationStatus: "validated",
        confidence: "high",
      });
    }

    if (/title lacks descriptive service context/.test(issueText)) {
      addFoundationRecommendation({
        id: "foundation-title-context",
        title: "Rewrite the homepage title with service context",
        detail:
          "Expand the homepage title to clearly communicate the primary service, category, and search intent while keeping it concise.",
        sourceModule: "SEO Foundation",
        impact: "Medium",
        effort: "Low",
        owner: "SEO / Content",
        timeline: "0–30 days",
        affectedUrls: [auditTargetUrl],
        evidence: [`Current title: ${title || "Not detected"}`],
        validationStatus: "validated",
        confidence: "high",
      });
    }

    if (/meta description needs rewriting/.test(issueText)) {
      addFoundationRecommendation({
        id: "foundation-meta-rewrite",
        title: "Replace generic or template meta description copy",
        detail:
          "Write a unique 140–160 character homepage description that accurately explains the business offer and includes a clear reason to click.",
        sourceModule: "SEO Foundation",
        impact: "High",
        effort: "Low",
        owner: "SEO / Content",
        timeline: "0–30 days",
        affectedUrls: [auditTargetUrl],
        evidence: [`Current meta description: ${description || "Not detected"}`],
        validationStatus: "validated",
        confidence: "high",
      });
    }

    if (/h1 lacks service context/.test(issueText)) {
      addFoundationRecommendation({
        id: "foundation-h1-context",
        title: "Rewrite the homepage H1 with service context",
        detail:
          "Use one primary H1 that combines the brand with the main service or value proposition.",
        sourceModule: "SEO Foundation",
        impact: "Medium",
        effort: "Low",
        owner: "SEO / Content",
        timeline: "0–30 days",
        affectedUrls: [auditTargetUrl],
        evidence: [`Current H1: ${h1 || "Not detected"}`],
        validationStatus: "validated",
        confidence: "high",
      });
    }

    if (/missing page title/.test(issueText)) {
      addFoundationRecommendation({
        id: "foundation-page-title",
        title: "Add a unique SEO title to the homepage",
        detail:
          "Create a concise homepage title that clearly communicates the primary topic and commercial intent.",
        sourceModule: "SEO Foundation",
        impact: "High",
        effort: "Low",
        owner: "SEO / Content",
        timeline: "0–30 days",
        affectedUrls: [auditTargetUrl],
        evidence: ["Homepage title was not detected."],
        validationStatus: "validated",
        confidence: "high",
      });
    }

    if (/missing meta description/.test(issueText)) {
      addFoundationRecommendation({
        id: "foundation-meta-description",
        title: "Add a unique homepage meta description",
        detail:
          "Write a clear 140–160 character description that explains the core offer and gives searchers a reason to click.",
        sourceModule: "SEO Foundation",
        impact: "Medium",
        effort: "Low",
        owner: "SEO / Content",
        timeline: "0–30 days",
        affectedUrls: [auditTargetUrl],
        evidence: [
          "Homepage meta description was not detected.",
        ],
        validationStatus: "validated",
        confidence: "high",
      });
    }

    if (/missing h1/.test(issueText)) {
      addFoundationRecommendation({
        id: "foundation-h1",
        title: "Add one clear primary H1 heading",
        detail:
          "Add one primary H1 that accurately defines the page topic and offer.",
        sourceModule: "SEO Foundation",
        impact: "Medium",
        effort: "Low",
        owner: "SEO / Content",
        timeline: "0–30 days",
        affectedUrls: [auditTargetUrl],
        evidence: ["Homepage H1 was not detected."],
        validationStatus: "validated",
        confidence: "high",
      });
    }
  });

  if (!hasSchema) {
    addFoundationRecommendation({
      id: "foundation-structured-data",
      title: "Add validated organization and service structured data",
      detail:
        "Add appropriate Organization, WebSite, and service-level schema that matches the visible page content and verified business details.",
      sourceModule: "AI Citation Readiness",
      impact: "High",
      effort: "Medium",
      owner: "SEO / Developer",
      timeline: "0–30 days",
      affectedUrls: [auditTargetUrl],
      evidence: ["No structured data block was detected on the audited page."],
      validationStatus: "validated",
      confidence: "high",
    });
  }

  if (!hasFaqSchema) {
    addFoundationRecommendation({
      id: "foundation-faq-schema",
      title: "Add validated FAQ schema to the audited page",
      detail:
        "Add a useful visible FAQ section and matching FAQPage structured data. Keep every structured answer consistent with the visible page content.",
      sourceModule: "AI Citation Readiness",
      impact: "High",
      effort: "Medium",
      owner: "SEO / Developer",
      timeline: "0–30 days",
      affectedUrls: [auditTargetUrl],
      evidence: ["FAQPage schema was not detected."],
      validationStatus: "validated",
      confidence: "high",
    });
  }

  const multipleH1Pages = (
    contentAnalysis?.results || []
  ).filter(
    (item: any) =>
      Array.isArray(item?.issues) &&
      item.issues.some((issue: any) =>
        /multiple h1/i.test(String(issue || ""))
      )
  );

  if (multipleH1Pages.length > 0) {
    addFoundationRecommendation({
      id: "foundation-multiple-h1",
      title: "Fix multiple H1 headings on affected content pages",
      detail:
        "Keep one primary H1 on each affected page and convert additional top-level headings to H2 or H3 based on the content hierarchy.",
      sourceModule: "Content Quality",
      impact: "Medium",
      effort: "Medium",
      owner: "SEO / Content",
      timeline: "0–30 days",
      affectedUrls: multipleH1Pages
        .map((item: any) => item?.url)
        .filter(Boolean)
        .slice(0, 3),
      evidence: [
        `Affected audited pages: ${multipleH1Pages.length}`,
      ],
      validationStatus: "validated",
      confidence: "high",
    });
  }
}

const recommendationFamily = (
  item: any
) => {
  const text = [
    item?.title,
    item?.detail,
    item?.sourceModule,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/faq/.test(text) && /schema/.test(text)) {
    return "faq-schema";
  }

  if (/structured data|organization schema|website schema|service schema/.test(text)) {
    return "structured-data";
  }

  if (/\bh1\b|primary heading|heading structure/.test(text)) {
    return "h1";
  }

  if (/meta description/.test(text)) {
    return "meta-description";
  }

  if (/page title|seo title|title tag/.test(text)) {
    return "page-title";
  }

  if (/alt text|alt attribute|image alt/.test(text)) {
    return "image-alt";
  }

  if (/mobile|pagespeed|core web vitals|loading performance|\blcp\b|\btbt\b/.test(text)) {
    return "performance";
  }

  if (/ai visibility|generative|unbranded ai|category visibility/.test(text)) {
    return "ai-visibility";
  }

  if (/organic visibility|keyword footprint|traffic/.test(text)) {
    return "organic-visibility";
  }

  if (/backlink|referring domain|authority/.test(text)) {
    return "backlink-authority";
  }

  return String(
    item?.title ||
      item?.detail ||
      ""
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const contentAnalysisValidated =
  Number(
    contentAnalysis?.analyzedPages ||
      contentAnalysis?.results?.length ||
      0
  ) > 0;

const recommendationKeys = new Set<string>();

const finalRecommendations = [
  ...foundationRecommendations,
  ...(aiRecommendations?.recommendations || []),
]
  .map(normalizeRecommendation)
  .filter(Boolean)
  .filter((item: any) => {
    const sourceModule = String(
      item?.sourceModule || ""
    ).toLowerCase();

    if (
      !contentAnalysisValidated &&
      (
        sourceModule.includes(
          "content quality"
        ) ||
        /audited content|content analysis/.test(
          [
            item?.title,
            item?.detail,
            ...(Array.isArray(item?.evidence)
              ? item.evidence
              : []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
        )
      )
    ) {
      return false;
    }

    const key = recommendationFamily(item);

    if (!key || recommendationKeys.has(key)) {
      return false;
    }

    recommendationKeys.add(key);
    return true;
  })
  .slice(0, 10);

const first30Days: any[] = [];
const next30Days: any[] = [];
const final30Days: any[] = [];

finalRecommendations.forEach((item: any) => {
  const timeline = String(
    item?.timeline || "31–60 days"
  ).toLowerCase();

  if (
    /0\s*[–-]\s*30|first|immediate|14 day/.test(
      timeline
    )
  ) {
    first30Days.push(item);
    return;
  }

  if (
    /61\s*[–-]\s*90|final|90 day/.test(
      timeline
    )
  ) {
    final30Days.push(item);
    return;
  }

  next30Days.push(item);
});

const actionRoadmap = {
  first30Days,
  next30Days,
  final30Days,
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
  scoreThresholds: {
    low: "1–5,000 modelled visits/month",
    medium: "5,001–25,000 modelled visits/month",
    high: "25,000+ modelled visits/month",
  },
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

  reportVersion: "4.0",
  reportTypes,
  auditConfig,
  url,
  submittedUrl: url,
  resolvedUrl,
  canonicalUrl,
  redirectCount,
  domain,
  businessContext,
  moduleStatus,
      unifiedOverview,
      title,
      description,
      h1,
      h1Count,
      imageCount,
      imagesWithAlt,
      imagesEmptyAlt,
      imagesMissingAlt,
      seoQuality: {
        titleLength,
        descriptionLength,
        titleNeedsContext,
        descriptionNeedsRewrite,
        h1NeedsContext,
        homepageMultipleH1:
          homepageContentHasMultipleH1,
      },
      searchContext: {
        country: locationName,
        countryCode:
          auditConfig.countryCode,
        language: languageName,
        languageCode,
        locationCode,
        device: selectedDevice,
        os: auditConfig.os,
        searchEngine,
        maxCrawlPages:
          auditConfig.maxCrawlPages,
        contentPageLimit:
          auditConfig.contentPageLimit,
      },

      overallScore,
      seoScore,
      uxScore,
      backlinkAuthorityScore: backlinkScore,
      backlinkAuthoritySignals,

      speedScore: primaryPageSpeed.score,
      configuredPrimaryDevice:
        selectedDevice,
      primaryPerformanceDevice,
      performanceFallbackUsed,
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
            suppressedCompetitorBrandedKeywords:
              Number(
                dataforseo?.keywordGap
                  ?.suppressedCompetitorBrandedKeywords ||
                  aiRecommendations
                    ?.suppressedCompetitorBrandedKeywords ||
                  0
              ),
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
            auditConfig: {
              ...auditConfig,
            },
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
            auditConfig: {
              ...auditConfig,
            },
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
                    ? "Legacy unauthenticated audit completed"
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