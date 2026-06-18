import { NextResponse } from "next/server";
import { queryAllModels, queryOpenAI } from "./query/route";
import { discoverPrompts } from "./prompts/route";
import { parseResponse, type ParsedResponse } from "@/lib/ai-visibility-parser";
import { calculateAIVisibilityScore } from "@/lib/ai-visibility-score";

function normalizeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }
}

function cleanBrandName(name: string) {
  return name
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|net|org|io|co|us|net|org)$/i, "")
    .replace(/[-_]/g, " ")
    .trim();
}

async function askOpenAI(prompt: string) {
  if (!process.env.OPENAI_API_KEY) return "";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.2,
      }),
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI visibility failed:", error);
    return "";
  }
}

function detectIndustry(domain: string, brandName: string) {
  const text = `${domain} ${brandName}`.toLowerCase();

  if (
    text.includes("multifamily") ||
    text.includes("realtor") ||
    text.includes("real estate") ||
    text.includes("property")
  ) {
    return "multifamily real estate brokerage";
  }

  if (
    text.includes("amazon") ||
    text.includes("shopify") ||
    text.includes("ecommerce") ||
    text.includes("e-commerce")
  ) {
    return "ecommerce marketing services";
  }

  if (
    text.includes("digital") ||
    text.includes("seo") ||
    text.includes("marketing") ||
    text.includes("agency")
  ) {
    return "digital marketing services";
  }

  return "business services";
}

function isSelfMention(name: string, brandName: string, domain: string) {
  const cleanedName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanedBrand = brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanedDomain = domain.split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");

  return (
    cleanedName.includes(cleanedBrand) ||
    cleanedName.includes(cleanedDomain) ||
    cleanedBrand.includes(cleanedName)
  );
}

function extractCompetitorsFromText(text: string, brandName: string, domain: string) {
  const banned = [
    "here are",
    "companies",
    "competitors",
    "alternatives",
    "services",
    "industry",
    "business",
    "include",
    "sources",
    "whether",
    "appears",
    "customers",
    "leading",
    "providers",
    "similar",
  ];

  const lines = text
    .replace(/\*\*/g, "")
    .replace(/\d+\.\s*/g, "\n")
    .replace(/,\s*/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/^[-•]\s*/, "")
        .replace(/[.:;]+$/g, "")
        .trim()
    )
    .filter(Boolean);

  return Array.from(
    new Set(
      lines
        .filter((line) => line.length > 2 && line.length < 60)
        .filter((line) => line.split(" ").length <= 6)
        .filter((line) => !banned.some((bad) => line.toLowerCase().includes(bad)))
        .filter((line) => !isSelfMention(line, brandName, domain))
    )
  ).slice(0, 10);
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "AI Visibility API working",
  });
}

async function deriveCategory(domain: string, brandName: string, hint: string): Promise<string> {
  const brandTokens = brandName.toLowerCase().split(/[\s.-]+/).filter((t) => t.length >= 3);
  const stripBrand = (s: string) =>
    s
      .toLowerCase()
      .split(/[\s—\-|:,]+/)
      .filter((w) => w && !brandTokens.includes(w))
      .join(" ")
      .trim();

  try {
    const ai = await queryOpenAI(
      `What product or service category is the website "${domain}" in? ` +
        `Reply with ONLY a short 2 to 5 word category (e.g. "SEO audit software", "CRM for small business"). ` +
        `Do NOT include the brand name. No punctuation, no extra words.`
    );
    const cleaned = stripBrand(ai.replace(/["'.]/g, "").trim());
    if (cleaned && cleaned.split(" ").length <= 6) return cleaned;
  } catch {
    // ignore and fall back
  }

  const fromHint = stripBrand(hint);
  if (fromHint && fromHint.length > 2) return fromHint;

  return "business services";
}

export async function POST(req: Request) {
  try {
const body = await req.json();
    const url = body?.url || body?.domain;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const domain = normalizeDomain(url);
    const brandName = cleanBrandName(body?.brandName?.trim() || domain);
    const industry = body?.industry?.trim() || detectIndustry(domain, brandName);

    const prompts = [
      `Return ONLY company names. List 10 companies similar to ${brandName} in ${industry}.`,
      `Return ONLY company names. List 10 best alternatives to ${brandName} for ${industry}.`,
      `Return ONLY company names. List 10 top competitors of ${brandName} in ${industry}.`,
      `Return ONLY company names. List 10 leading brands or service providers in ${industry}.`,
      `Return ONLY company names. List 10 companies customers may compare with ${brandName} in ${industry}.`,
    ];

    const results: any[] = [];

    const brandTerms = [
      brandName.toLowerCase(),
      cleanBrandName(brandName).toLowerCase(),
      domain.toLowerCase(),
      cleanBrandName(domain).toLowerCase(),
      domain.split(".")[0].toLowerCase(),
      brandName.toLowerCase().replace(/\s+/g, ""),
    ].filter(Boolean);

    for (const prompt of prompts) {
      const response = await askOpenAI(prompt);
      const responseText = response.toLowerCase();

      const mentioned = brandTerms.some((term) =>
        responseText.includes(term.toLowerCase())
      );

      results.push({
        prompt,
        mentioned,
        responseSnippet: response.slice(0, 700),
        competitors: extractCompetitorsFromText(response, brandName, domain),
      });
    }

    let perplexityContent = "";
    let perplexityMentioned = false;
    let perplexityCitations: string[] = [];
    let perplexityCompetitors: string[] = [];

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const perplexityRes = await fetch(`${baseUrl}/api/perplexity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Return top companies similar to ${brandName} in ${industry}. Mention whether ${domain} appears. Include competitors and sources.`,
        }),
      });

      const rawText = await perplexityRes.text();

      if (!rawText.startsWith("<!DOCTYPE")) {
        const perplexityData = JSON.parse(rawText);

        perplexityContent = perplexityData?.content || "";
        perplexityCitations = perplexityData?.citations || [];
        perplexityCompetitors = perplexityData?.competitors || [];

        const perplexityText = perplexityContent.toLowerCase();

        perplexityMentioned = brandTerms.some((term) =>
          perplexityText.includes(term.toLowerCase())
        );
      }
    } catch (error) {
      console.error("Perplexity failed:", error);
    }

    const totalPrompts = results.length;
    const brandMentions = results.filter((item) => item.mentioned).length;

    const openAIScore =
      totalPrompts > 0 ? Math.round((brandMentions / totalPrompts) * 100) : 0;

    const finalScore = Math.max(
      0,
      Math.min(100, Math.round(openAIScore * 0.75 + (perplexityMentioned ? 25 : 0)))
    );

    const allCompetitors = Array.from(
      new Set([
        ...results.flatMap((item) => item.competitors || []),
        ...perplexityCompetitors,
      ])
    )
      .map((item) => String(item).trim())
      .filter(Boolean)
      .filter((item) => !isSelfMention(item, brandName, domain))
      .slice(0, 10);

    const recommendations = [
      `Create stronger topical content around ${industry}.`,
      `Publish comparison pages against key competitors.`,
      `Improve brand mentions across trusted industry websites.`,
      `Add schema, FAQs, and expert author signals to strengthen AI understanding.`,
      `Build citations and backlinks from relevant ${industry} sources.`,
    ];

    const positioningInsight =
      finalScore < 40
        ? `${brandName} has low AI visibility for ${industry}. Competitors are more likely to be recommended because the brand has weaker public signals, fewer citations, or less topical authority.`
        : finalScore < 70
        ? `${brandName} has moderate AI visibility for ${industry}. The brand appears sometimes, but competitors still have stronger recognition.`
        : `${brandName} has strong AI visibility for ${industry}. The next priority is improving how positively and prominently the brand is positioned.`;

// 🆕 LIVE MULTI-MODEL ANALYSIS (ChatGPT + Claude + Gemini) — natural buyer questions
    let aiSearchVisibility: any = null;
    try {
      const incomingCompetitors: string[] = Array.isArray(body?.competitors) ? body.competitors : [];

// 🆕 Real market category (kabhi brand nahi) → prompts self-referential nahi rahenge
      const category = await deriveCategory(domain, brandName, String(body?.industry || ""));
      const nlPrompts = (await discoverPrompts(domain, category, incomingCompetitors)).slice(0, 10);

      const perPrompt = await Promise.all(
        nlPrompts.map(async (prompt) => ({
          prompt,
          modelResults: await queryAllModels(prompt),
        }))
      );

      const parsed: ParsedResponse[] = [];
      const promptResults: any[] = [];
      for (const { prompt, modelResults } of perPrompt) {
        const row: any = { prompt, models: {}, avgPosition: null };
        const positions: number[] = [];
        for (const mr of modelResults) {
          const p = parseResponse(mr.response, prompt, mr.model, brandName, incomingCompetitors);
          parsed.push(p);
          row.models[mr.model] = { mentioned: p.brandMentioned, position: p.brandPosition, error: mr.error };
          if (p.brandMentioned && p.brandPosition) positions.push(p.brandPosition);
        }
        row.avgPosition = positions.length
          ? Number((positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1))
          : null;
        promptResults.push(row);
      }

      const score = calculateAIVisibilityScore(parsed);
      const modelsCalled = Array.from(new Set(
        perPrompt.flatMap((pp) => pp.modelResults.filter((m) => m.response).map((m) => m.model))
      ));

      aiSearchVisibility = {
        ...score,
        promptResults,
        totalPrompts: nlPrompts.length,
        modelsCalled,
        brand: brandName,
        industry: category,
        source: "Live AI Models (ChatGPT, Claude, Gemini)",
      };
    } catch (err) {
      console.error("Multi-model AI visibility failed:", err);
      aiSearchVisibility = null;
    }

    return NextResponse.json({
      success: true,
      aiSearchVisibility,
      aiVisibility: {
        brandName,
        domain,
        industry,
        score: finalScore,
        totalPrompts,
        brandMentions,
        perplexityMentioned,
        results,
        competitors: allCompetitors,
        positioningInsight,
        aiRecommendations: recommendations,
        perplexity: {
          mentioned: perplexityMentioned,
          content: perplexityContent,
          citations: perplexityCitations,
          competitors: perplexityCompetitors,
        },
      },
    });
  } catch (error) {
    console.error("AI visibility error:", error);

    return NextResponse.json(
      { success: false, error: "AI visibility failed" },
      { status: 500 }
    );
  }
}