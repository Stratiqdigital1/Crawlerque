import { NextResponse } from "next/server";

function normalizeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");
  }
}

function cleanBrandName(domain: string) {
  return domain
    .replace(/\.(com|net|org|io|co|us|pk)$/i, "")
    .replace(/[-_]/g, " ")
    .trim();
}

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

  const safePayload = payload;

console.log("FINAL DATAFORSEO PAYLOAD:", JSON.stringify(safePayload, null, 2));

  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(safePayload),
    cache: "no-store",
  });

  const json = await res.json();

  return json;
}

function extractText(result: any) {
  try {
    const task = result?.tasks?.[0];
    const resultItem = task?.result?.[0];

    // direct items
    const item =
      resultItem?.items?.[0] ||
      resultItem ||
      {};

    const possible =
      item?.sections?.map((s: any) => s.text).join("\n") ||
      item?.text ||
      item?.content ||
      item?.response ||
      item?.answer ||
      item?.message ||
      item?.result ||
      item?.description ||
      item?.ai_response ||
      item?.choices?.[0]?.message?.content ||
      item?.items?.[0]?.text ||
      item?.items?.[0]?.content;

    if (
      typeof possible === "string" &&
      possible.trim() &&
      possible.trim() !== "{}"
    ) {
      return possible.trim();
    }

    // fallback stringify
    const fallback = JSON.stringify(item);

    if (fallback && fallback !== "{}") {
      return fallback.slice(0, 3000);
    }

    return "";
  } catch {
    return "";
  }
}

function checkMention(text: string, brandName: string, domain: string) {
  const lower = String(text || "").toLowerCase();

  const variations = [
    domain.toLowerCase(),
    brandName.toLowerCase(),
    brandName.toLowerCase().replace(/\s+/g, ""),
    brandName.toLowerCase().replace(/-/g, " "),
    brandName.toLowerCase().replace(/\s+/g, "-"),
  ];

  return variations.some((v) => lower.includes(v));
}

export async function GET() {
  return runAIOptimization({
    url: "https://losangelesmultifamilyrealtor.com",
    industry: "multifamily real estate brokerage",
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  return runAIOptimization({
    url: body?.url || body?.domain,
    industry: body?.industry || "business services",
  });
}

async function runAIOptimization({
  url,
  industry,
}: {
  url: string;
  industry: string;
}) {
  try {
    const domain = normalizeDomain(url);
    const brandName = cleanBrandName(domain);

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 }
      );
    }

    const prompt = `Which ${industry} companies or websites would AI naturally recommend first? Include whether ${brandName} or ${domain} appears, why it is trusted or missing, and what content, SEO, backlink, review, and entity signals would improve AI visibility.`;


    const dataForSeoModels = [
  {
    key: "chat_gpt",
    label: "DataForSEO ChatGPT",
    endpoint: "ai_optimization/chat_gpt/llm_responses/live",
    model_name: "gpt-4o-mini",
  },
  {
    key: "perplexity",
    label: "DataForSEO Perplexity",
    endpoint: "ai_optimization/perplexity/llm_responses/live",
    model_name: "sonar",
  },
];

const settled = await Promise.allSettled(
  dataForSeoModels.map((model) =>
    dataForSeoPost(model.endpoint, [
      {
  user_prompt: prompt,
  model_name: model.model_name,
}
    ])
  )
);

// Raw debug removed after confirming DataForSEO response structure.

    const models = dataForSeoModels.map((model, index) => {
      const result = settled[index];
      const raw = result.status === "fulfilled" ? result.value : null;

const task = raw?.tasks?.[0];

const response = raw ? extractText(raw) : "";
const mentioned = checkMention(response, brandName, domain);

const taskStatusCode = task?.status_code;
const taskStatusMessage = task?.status_message;
const resultCount = task?.result_count;


return {
  model: model.label,
  provider: "DataForSEO AI Optimization API",
  mentioned,
  responseSnippet:
    response && response !== "{}"
      ? response.slice(0, 800)
      : "Data not available from DataForSEO AI Optimization API.",
  fullResponse: response,
  statusCode: taskStatusCode,
  statusMessage: taskStatusMessage,
  resultCount,
  error:
    result.status === "rejected"
      ? result.reason?.message || "Failed"
      : response
      ? null
      : taskStatusMessage || "No usable response returned from DataForSEO",
};
    });

    const validModels = models.filter(
      (m) => m.fullResponse && m.fullResponse !== "{}"
    );

    const competitorMap = new Map<string, number>();

    validModels.forEach((m) => {
      const text = String(m.fullResponse || "");

      const matches =
        text.match(/\b([A-Z][a-zA-Z0-9&.-]+\.(com|net|org|io|co|ai|us|pk))\b/g) ||
        [];

      matches.forEach((domainMatch) => {
        const clean = domainMatch.toLowerCase();

        if (
          !clean.includes(domain.toLowerCase()) &&
          !clean.includes("google") &&
          !clean.includes("youtube")
        ) {
          competitorMap.set(clean, (competitorMap.get(clean) || 0) + 1);
        }
      });
    });

    const aiCompetitors = Array.from(competitorMap.entries())
      .map(([domain, mentions]) => ({
        domain,
        mentions,
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);

    const validModelCount = validModels.length;
const totalModels = models.length;
const totalMentions = validModels.filter((m) => m.mentioned).length;

const rawVisibilityScore =
  validModelCount > 0
    ? Math.round((totalMentions / validModelCount) * 100)
    : 0;

const confidence =
  validModelCount >= 4 ? "high" : validModelCount >= 3 ? "medium" : "low";

const visibilityScore =
  confidence === "low" && rawVisibilityScore === 100
    ? 70
    : rawVisibilityScore;

const scoreLabel =
  confidence === "low"
    ? "Directional AI Visibility Signal"
    : "AI Visibility Score";

    return NextResponse.json({
      success: true,
      aiOptimization: {
        domain,
        brandName,
        industry,
        prompt,
        totalModels,
validModelCount,
totalMentions,
visibilityScore,
rawVisibilityScore,
confidence,
scoreLabel,
models,
        recommendations: [
          totalMentions === 0
            ? `Improve AI visibility by creating stronger entity signals for ${brandName}, including expert content, schema, citations, comparison pages, and trusted third-party mentions in the ${industry} category.`
            : confidence === "low"
  ? `${brandName} appeared in ${totalMentions} of ${validModelCount} usable AI responses. Treat this as a directional signal, not complete AI market visibility. Improve confidence by testing more prompts, models, entity signals, expert content, schema, reviews, and third-party citations.`
  : `${brandName} is being mentioned by DataForSEO AI responses, but visibility can improve by expanding topical authority and third-party citations.`,
          `Create buyer-intent content that directly answers prompts related to ${industry}.`,
          `Build trusted external mentions so AI systems can associate ${brandName} with ${industry}.`,
        ],
        aiCompetitors,
        source: "DataForSEO AI Optimization API",
      },
    });
  } catch (error) {
    console.error("AI Optimization route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "AI Optimization route failed",
      },
      { status: 500 }
    );
  }
}