import { NextResponse } from "next/server";
import {
  AuditIdentityError,
  buildAuditIdentity,
} from "@/lib/audit-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2_000_000;

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

function stripTags(value: string) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function readMeta(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const first = new RegExp(
    `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const second = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["']`,
    "i"
  );
  return decodeHtmlEntities(html.match(first)?.[1] || html.match(second)?.[1] || "");
}

function readTitle(html: string) {
  return stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
}

function readHeadings(html: string, tag: "h1" | "h2" | "h3") {
  const matches = Array.from(
    html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))
  );
  return matches
    .map((match) => stripTags(match[1] || ""))
    .filter(Boolean);
}

function countMatches(html: string, expression: RegExp) {
  return (html.match(expression) || []).length;
}

function calculateContentScore(input: {
  title: string;
  description: string;
  h1: string[];
  h2: string[];
  wordCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  hasSchema: boolean;
  hasFaqSchema: boolean;
}) {
  let score = 100;
  const issues: string[] = [];

  if (!input.title) {
    score -= 15;
    issues.push("Missing page title");
  }
  if (!input.description) {
    score -= 12;
    issues.push("Missing meta description");
  }
  if (input.h1.length === 0) {
    score -= 15;
    issues.push("Missing H1 heading");
  } else if (input.h1.length > 1) {
    score -= 5;
    issues.push("Multiple H1 headings detected");
  }
  if (input.h2.length === 0 && input.wordCount >= 300) {
    score -= 8;
    issues.push("Long content has no H2 structure");
  }
  if (input.wordCount < 300) {
    score -= 20;
    issues.push("Thin content: fewer than 300 words");
  } else if (input.wordCount < 600) {
    score -= 8;
    issues.push("Content depth is limited");
  }
  if (input.imagesMissingAlt > 0) {
    score -= Math.min(10, input.imagesMissingAlt * 2);
    issues.push(`${input.imagesMissingAlt} image(s) missing ALT text`);
  }
  if (!input.hasSchema) {
    score -= 5;
    issues.push("No structured data detected");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    grade:
      score >= 85
        ? "Strong"
        : score >= 70
          ? "Good"
          : score >= 50
            ? "Needs Work"
            : "Weak",
    issues,
  };
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "CrawlerQue-Content-Audit/1.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Page returned HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("Page response was too large to analyze safely");
  }

  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("Page response was too large to analyze safely");
  }

  return {
    text,
    resolvedUrl: response.url || url,
    contentType: response.headers.get("content-type") || "",
  };
}

function sameDomain(url: string, domain: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() === domain;
  } catch {
    return false;
  }
}

function parseSitemapUrls(xml: string, baseUrl: string, domain: string) {
  return Array.from(xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi))
    .map((match) => decodeHtmlEntities(match[1] || ""))
    .map((value) => {
      try {
        return new URL(value, baseUrl).toString();
      } catch {
        return "";
      }
    })
    .filter((value) => value && sameDomain(value, domain));
}

async function discoverUrls(startUrl: string, domain: string, maxPages: number) {
  const candidates = new Set<string>([startUrl]);
  const origin = new URL(startUrl).origin;
  const sitemapUrls = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
  ];

  for (const sitemapUrl of sitemapUrls) {
    if (candidates.size >= maxPages) break;

    try {
      const sitemap = await fetchText(sitemapUrl);
      const discovered = parseSitemapUrls(sitemap.text, sitemapUrl, domain);

      for (const discoveredUrl of discovered) {
        if (candidates.size >= maxPages) break;

        if (/\.xml(?:$|\?)/i.test(discoveredUrl)) {
          try {
            const nested = await fetchText(discoveredUrl);
            for (const nestedUrl of parseSitemapUrls(
              nested.text,
              discoveredUrl,
              domain
            )) {
              if (candidates.size >= maxPages) break;
              if (!/\.xml(?:$|\?)/i.test(nestedUrl)) candidates.add(nestedUrl);
            }
          } catch {
            // Ignore a broken nested sitemap and continue with available URLs.
          }
        } else {
          candidates.add(discoveredUrl);
        }
      }
    } catch {
      // A sitemap is optional. The resolved homepage remains the fallback.
    }
  }

  return Array.from(candidates).slice(0, maxPages);
}

function analyzePage(url: string, html: string) {
  const title = readTitle(html);
  const description = readMeta(html, "description");
  const h1 = readHeadings(html, "h1");
  const h2 = readHeadings(html, "h2");
  const h3 = readHeadings(html, "h3");
  const visibleText = stripTags(html);
  const wordCount = visibleText.split(/\s+/).filter(Boolean).length;
  const imageCount = countMatches(html, /<img[\s>]/gi);
  const imagesWithAlt = countMatches(
    html,
    /<img[^>]+alt=["'][^"']+["'][^>]*>/gi
  );
  const imagesMissingAlt = Math.max(0, imageCount - imagesWithAlt);
  const schemaBlocks =
    html.match(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
    ) || [];
  const hasSchema = schemaBlocks.length > 0;
  const hasFaqSchema = schemaBlocks.some((block) => /FAQPage/i.test(block));
  const mediaCount = imageCount + countMatches(html, /<(video|audio|iframe)[\s>]/gi);
  const scoring = calculateContentScore({
    title,
    description,
    h1,
    h2,
    wordCount,
    imageCount,
    imagesMissingAlt,
    hasSchema,
    hasFaqSchema,
  });

  return {
    url,
    domain: new URL(url).hostname.replace(/^www\./, ""),
    title,
    metaDescription: description,
    mainTopic: h1[0] || title || "",
    h1,
    h2Count: h2.length,
    h3Count: h3.length,
    wordCount,
    contentLength: visibleText.length,
    mediaCount,
    imageCount,
    imagesMissingAlt,
    hasSchema,
    hasFaqSchema,
    score: scoring.score,
    grade: scoring.grade,
    issues: scoring.issues,
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message:
      "First-party Content Quality API is working. Use POST with a website URL.",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputUrl = String(body?.url || body?.domain || "").trim();

    if (!inputUrl) {
      return NextResponse.json(
        { success: false, error: "Website URL is required" },
        { status: 400 }
      );
    }

    let identity;
    try {
      identity = buildAuditIdentity({
        userId: "content-analysis",
        url: inputUrl,
        reportTypes: ["content"],
      });
    } catch (error) {
      if (error instanceof AuditIdentityError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }

    const maxPages = Math.min(
      20,
      Math.max(1, Number(body?.maxPages || 10))
    );
    const urls = await discoverUrls(
      identity.normalizedUrl,
      identity.normalizedDomain,
      maxPages
    );

    const settled = await Promise.allSettled(
      urls.map(async (pageUrl) => {
        const page = await fetchText(pageUrl);
        if (!/text\/html|application\/xhtml\+xml/i.test(page.contentType)) {
          throw new Error("URL did not return an HTML document");
        }
        if (!sameDomain(page.resolvedUrl, identity.normalizedDomain)) {
          throw new Error("URL redirected outside the audited domain");
        }
        return analyzePage(page.resolvedUrl, page.text);
      })
    );

    const results = settled
      .filter(
        (result): result is PromiseFulfilledResult<ReturnType<typeof analyzePage>> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value);

    const failedPages = settled.length - results.length;
    const averageScore = results.length
      ? Math.round(
          results.reduce((sum, item) => sum + item.score, 0) / results.length
        )
      : null;

    return NextResponse.json({
      success: true,
      contentAnalysis: {
        domain: identity.normalizedDomain,
        scope: "first-party",
        requestedPages: urls.length,
        analyzedPages: results.length,
        failedPages,
        averageScore,
        results,
        source: "Crawler Que First-Party Content Quality Engine",
        note:
          "Only pages from the audited domain are included in the Content Quality score.",
      },
    });
  } catch (error) {
    console.error("First-party Content Quality route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Content Quality analysis failed",
      },
      { status: 500 }
    );
  }
}
