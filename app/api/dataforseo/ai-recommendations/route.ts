import { NextResponse } from "next/server";
import type { PageGeoScore } from "@/lib/geo-readiness";

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) return null;

  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

async function dataForSeoPost(endpoint: string, payload: any[]) {
  const auth = getAuthHeader();

  if (!auth) {
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD");
  }

  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.status_message || "DataForSEO request failed");
  }

  return json;
}

function extractText(result: any) {
  const resultItem = result?.tasks?.[0]?.result?.[0];
  const item = resultItem?.items?.[0] || resultItem || {};

  const text =
    item?.text ||
    item?.content ||
    item?.response ||
    item?.answer ||
    item?.message ||
    item?.result ||
    item?.choices?.[0]?.message?.content ||
    "";

  if (typeof text === "string" && text.trim() !== "{}") {
    return text.trim();
  }

  return "";
}

function fallbackRecommendations(body: any) {
  const domain = body?.domain || "this website";
  const keyword = body?.seedKeyword || body?.domain || "the target keyword";

const topGap = body?.keywordGaps?.[0];
const topCompetitor = body?.competitors?.[0];

// Page-specific GEO recommendations, if page scores were provided.
const pagesNeedingWork: PageGeoScore[] = body?.pageInsights?.pagesNeedingOptimization || [];
const pageRecs = pagesNeedingWork.slice(0, 2).map((p) =>
  `Improve AI discoverability for ${p.url} (GEO score ${p.score}/100): ${p.topIssue || "add structured data and expand content depth"}.`
);

return [
  ...pageRecs,
  topGap?.keyword
    ? `Create a ${topGap.recommendedPageType || "targeted landing page"} for "${topGap.keyword}" because it has an opportunity score of ${topGap.opportunityScore || "N/A"}/100 and can close a competitor keyword gap.`
    : `Create commercial content around "${keyword}" and related buyer-intent searches to improve organic rankings and AI recommendation relevance.`,

  topCompetitor?.domain
    ? `Reduce competitive risk from ${topCompetitor.domain} by targeting overlapping keywords and improving the pages where this competitor has stronger ${topCompetitor.likelyWinningFactor || "organic visibility"}.`
    : `Use competitor keyword gaps to create comparison pages, category pages, and educational content that targets missed search demand.`,

  `Improve AI visibility for ${domain} by strengthening entity signals, schema markup, expert content, FAQs, and trusted third-party mentions.`,

  `Fix priority technical issues such as mobile performance, missing alt text, weak metadata, and crawl depth problems.`,

  `Build more authoritative backlinks and brand mentions from relevant industry websites, directories, publications, and partner pages.`,

  `Improve content trust by adding reviews, case studies, author expertise, product/service proof, and clear brand information.`,
];
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "AI Recommendations API is working. Use POST with audit data.",
  });
}

export async function POST(req: Request) {
  try {
    let body: any = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const topKeywordOpportunities = (body?.keywordGaps || [])
  .slice(0, 8)
  .map((k: any) => ({
    keyword: k.keyword,
    intent: k.intent,
    opportunityScore: k.opportunityScore,
    recommendedPageType: k.recommendedPageType,
    action: k.action,
    volume: k.volume || k.search_volume,
    difficulty: k.difficulty || k.keyword_difficulty,
  }));

const topCompetitorThreats = (body?.competitors || [])
  .slice(0, 6)
  .map((c: any) => ({
    domain: c.domain,
    threatScore: c.threatScore,
    competitiveStrength: c.competitiveStrength,
    likelyWinningFactor: c.likelyWinningFactor,
    aiRisk: c.aiRisk,
    sharedKeywords: c.sharedKeywords || c.intersections,
    traffic: c.traffic,
  }));

const prompt = `
You are an expert SEO, AI visibility, and website growth strategist.

Create real, specific recommendations based only on this audit data:

Domain: ${body?.domain || "Data not available"}
Primary Topic / Seed Keyword: ${body?.seedKeyword || "Data not available"}
SEO Score: ${body?.seoScore ?? "Data not available"}
UX Score: ${body?.uxScore ?? "Data not available"}
AI Visibility: ${body?.aiVisibilityScore ?? "Data not available"}
Monthly Organic Traffic: ${body?.monthlyTraffic ?? "Data not available"}
Organic Keywords: ${body?.organicKeywords ?? "Data not available"}
Top Competitor Threats: ${JSON.stringify(topCompetitorThreats)}
Top Keyword Opportunities: ${JSON.stringify(topKeywordOpportunities)}
Technical Issues: ${JSON.stringify(body?.issues || [])}
SERP Data: ${JSON.stringify(body?.serpData || [])}
Backlinks: ${JSON.stringify(body?.backlinks || {})}
Content Analysis: ${JSON.stringify(body?.contentAnalysis || {})}
Pages Needing AI-Visibility Optimization: ${JSON.stringify(
  (body?.pageInsights?.pagesNeedingOptimization || []).map((p: any) => ({
    url: p.url, score: p.score, topIssue: p.topIssue,
  }))
)}
Top AI-Visibility Performing Pages: ${JSON.stringify(
  (body?.pageInsights?.topPerformingPages || []).map((p: any) => ({ url: p.url, score: p.score }))
)}

Return 6 to 10 concise, actionable recommendations. Where page URLs are
given above, reference the SPECIFIC URL and its topIssue in at least one
recommendation rather than speaking generically about "the website".

Rules:
- Prioritize keyword opportunities with higher opportunityScore.
- Recommend the exact page type when recommendedPageType is available.
- Reference competitor threats only when threatScore or competitiveStrength exists.
- Include AI visibility actions only if AI visibility is low, directional, or competitor AI risk is meaningful.
- Avoid generic advice.
- Do not invent data.
- Do not return JSON.
- Return plain numbered recommendations only.
`;

    let text = "";

    try {
      const aiRes = await dataForSeoPost(
        "ai_optimization/gemini/llm_responses/live",
        [
          {
            user_prompt: prompt,
            model_name: "gemini-1.5-flash",
          },
        ]
      );

      text = extractText(aiRes);
    } catch (error) {
      console.error("DataForSEO AI recommendation call failed:", error);
    }

    const recommendations = (text ? text.split(/\n+/) : fallbackRecommendations(body))
      .map((line: string) =>
        String(line || "")
          .replace(/^\d+[\).\s-]+/, "")
          .replace(/^[-•]\s*/, "")
          .trim()
      )
      .filter((line: string) => {
        const value = line.toLowerCase();

        return (
          line.length > 20 &&
          line !== "{}" &&
          line !== "[]" &&
          !value.includes("status_code") &&
          !value.includes("tasks") &&
          !value.includes("dataforseo")
        );
      })
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      aiRecommendations: {
        recommendations:
          recommendations.length > 0
            ? recommendations
            : fallbackRecommendations(body),
        fullResponse: text || "",
        source: text
          ? "DataForSEO AI Optimization Recommendation Engine"
          : "Fallback Recommendation Engine",
      },
    });
  } catch (error) {
    console.error("AI Recommendations route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "AI Recommendations failed",
      },
      { status: 500 }
    );
  }
}