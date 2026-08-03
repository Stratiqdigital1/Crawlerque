import { isIP } from "net";
import { resolve4, resolve6 } from "dns/promises";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { withSecurityHeaders } from "@/lib/security-headers";
import {
  resolveBusinessContext,
} from "@/lib/business-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return true;

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv6(ip: string) {
  const value = ip.toLowerCase();
  return (
    value === "::1" ||
    value === "::" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  );
}

function isPrivateIp(ip: string) {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return true;
}

async function assertPublicHostname(hostname: string) {
  const lowered = hostname.toLowerCase();
  if (
    lowered === "localhost" ||
    lowered.endsWith(".localhost") ||
    lowered.endsWith(".local") ||
    lowered.endsWith(".internal")
  ) {
    throw new Error("Private or local URLs are not allowed.");
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("Private IP addresses are not allowed.");
    return;
  }

  const addresses = new Set<string>();
  const [v4, v6] = await Promise.all([
    resolve4(hostname).catch(() => [] as string[]),
    resolve6(hostname).catch(() => [] as string[]),
  ]);

  v4.forEach((ip) => addresses.add(ip));
  v6.forEach((ip) => addresses.add(ip));

  if (!addresses.size) throw new Error("The domain could not be resolved.");
  if (Array.from(addresses).some(isPrivateIp)) {
    throw new Error("The domain resolved to a private or local network address.");
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
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function getTitle(html: string) {
  return decodeHtmlEntities(html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || "");
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
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

async function fetchHomepage(inputUrl: string) {
  let currentUrl = new URL(inputUrl);
  let redirects = 0;

  for (let hop = 0; hop <= 5; hop += 1) {
    if (!["http:", "https:"].includes(currentUrl.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are allowed.");
    }

    await assertPublicHostname(currentUrl.hostname);

    const browserHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/150.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Upgrade-Insecure-Requests": "1",
    };

    let response = await fetch(currentUrl.toString(), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: browserHeaders,
      signal: AbortSignal.timeout(8000),
    });

    // Some sites reject obvious server-side probes with a transient 403.
    // Retry once with a lightweight referer while keeping paid-provider calls at zero.
    if (response.status === 403) {
      response = await fetch(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers: {
          ...browserHeaders,
          Referer: `${currentUrl.protocol}//${currentUrl.hostname}/`,
        },
        signal: AbortSignal.timeout(8000),
      });
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The website returned an invalid redirect.");
      currentUrl = new URL(location, currentUrl);
      redirects += 1;
      continue;
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          "Website blocked the homepage preview with HTTP 403. This is an origin/WAF restriction, not a paid-provider or classifier failure."
        );
      }
      throw new Error(`Website returned HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("The URL did not return an HTML page.");
    }

    const html = await response.text();
    return { html, resolvedUrl: currentUrl.toString(), redirects };
  }

  throw new Error("Too many redirects.");
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("stratiq_session")?.value;
  const session: any = token ? await verifySessionToken(token) : null;

  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true },
  });

  if (!user || user.status !== "active" || user.role !== "admin") return null;
  return user;
}

async function handlePreview(urlValue: string, country: string) {
  const admin = await requireAdmin();
  if (!admin) {
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: "Admin access required." },
        { status: 403 }
      )
    );
  }

  const input = String(urlValue || "").trim();
  if (!input) {
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: "URL is required." },
        { status: 400 }
      )
    );
  }

  const normalizedInput = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  try {
    const page = await fetchHomepage(normalizedInput);
    const resolved = new URL(page.resolvedUrl);
    const title = getTitle(page.html);
    const description = getDescription(page.html);
    const h1 = getFirstH1(page.html);
    const bodyText = getBodyText(page.html);

const context =
  await resolveBusinessContext({
    html:
      page.html,

    title,

    description,

    h1,

    bodyText,

    domain:
      resolved.hostname,

    countryName:
      country ||
      "United States",
  });

const aiPrompts =
  Array.isArray(
    context.aiPrompts
  )
    ? context.aiPrompts
    : [];

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
costMode:
  context.semanticFallbackUsed
    ? "homepage-plus-semantic-fallback"
    : "homepage-only",

paidProviderCalls:
  context.semanticFallbackUsed
    ? 1
    : 0,
        url: normalizedInput,
        resolvedUrl: page.resolvedUrl,
        redirects: page.redirects,
        homepage: {
          title,
          metaDescription: description,
          h1,
        },
        businessContext: context,
preview: {
  keywordSeed:
    context.searchSeed ||
    context.primaryService,

  aiPrompts,

  serpKeywords:
    context.serpKeywords,

  localSeoQuery:
    context.localSeoApplicable ===
    false
      ? null
      : `${context.brandName} ${context.localQueryService}`.trim(),
},

classification: {
  method:
    context.resolutionMethod,

  semanticFallbackUsed:
    context.semanticFallbackUsed,

  marketRole:
    context.marketRole,

  localSeoApplicable:
    context.localSeoApplicable,
},
      })
    );
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Context preview failed.",
        },
        { status: 400 }
      )
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return handlePreview(
    url.searchParams.get("url") || "",
    url.searchParams.get("country") || "United States"
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handlePreview(
    String(body?.url || body?.domain || ""),
    String(body?.country || body?.locationName || "United States")
  );
}
