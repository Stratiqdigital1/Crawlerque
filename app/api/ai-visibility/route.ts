import { NextResponse } from "next/server";
import { queryAllModels, queryOpenAI } from "./query/route";
import { getKeywordIntel } from "./prompts/route";
import { parseResponse, knowsBrand, extractBrandCitations, type ParsedResponse } from "@/lib/ai-visibility-parser";
import { calculateAIVisibilityScore } from "@/lib/ai-visibility-score";
import { getLocationCode } from "@/lib/dataforseo-config";

export const maxDuration = 120;

function normalizeDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, ""); }
}
function cleanBrandName(name: string) {
  return name.replace(/^https?:\/\//, "").replace(/^www\./, "")
    .replace(/\.(com|net|org|io|co|us|pk)$/i, "").replace(/[-_]/g, " ").trim();
}
async function askOpenAI(prompt: string) {
  if (!process.env.OPENAI_API_KEY) return "";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 300, temperature: 0.2 }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  } catch (e) { console.error("OpenAI visibility failed:", e); return ""; }
}
function detectIndustry(domain: string, brandName: string) {
  const text = `${domain} ${brandName}`.toLowerCase();
  if (text.includes("multifamily")||text.includes("realtor")||text.includes("real estate")||text.includes("property")) return "multifamily real estate brokerage";
  if (text.includes("amazon")||text.includes("shopify")||text.includes("ecommerce")||text.includes("e-commerce")) return "ecommerce marketing services";
  if (text.includes("digital")||text.includes("seo")||text.includes("marketing")||text.includes("agency")) return "digital marketing services";
  return "business services";
}
function isSelfMention(name: string, brandName: string, domain: string) {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const b = brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const d = domain.split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  return n.includes(b) || n.includes(d) || b.includes(n);
}
function extractCompetitorsFromText(text: string, brandName: string, domain: string) {
  const banned = ["here are","companies","competitors","alternatives","services","industry","business","include","sources","whether","appears","customers","leading","providers","similar"];
  const lines = text.replace(/\*\*/g,"").replace(/\d+\.\s*/g,"\n").replace(/,\s*/g,"\n").split("\n")
    .map((l)=>l.replace(/^[-•]\s*/,"").replace(/[.:;]+$/g,"").trim()).filter(Boolean);
  return Array.from(new Set(lines.filter((l)=>l.length>2&&l.length<60).filter((l)=>l.split(" ").length<=6)
    .filter((l)=>!banned.some((b)=>l.toLowerCase().includes(b))).filter((l)=>!isSelfMention(l,brandName,domain)))).slice(0,10);
}

// ── Country detection for location-aware prompts (Feature B) ──
const COUNTRY_LOC: Record<string, number> = {
  pakistan:2586, india:2356, bangladesh:2050, "united kingdom":2826, uk:2826, england:2826,
  australia:2036, canada:2124, uae:2784, "united arab emirates":2784, dubai:2784,
"united states":2840, us:2840, usa:2840, america:2840,
};
const COUNTRY_ISO: Record<string, string> = {
  pakistan: "PK", india: "IN", bangladesh: "BD",
  "united kingdom": "GB", uk: "GB", england: "GB",
  australia: "AU", canada: "CA",
  uae: "AE", "united arab emirates": "AE", dubai: "AE",
  "united states": "US", us: "US", usa: "US", america: "US",
};
async function detectCountry(domain: string, brandName: string): Promise<string> {
  try {
    const ai = await queryOpenAI(
      `Which single country is the website ${domain} (brand "${brandName}") primarily based in or selling to? ` +
      `Reply with ONLY the country name. If unsure, reply "US".`
    );
    const c = (ai || "US").trim().split(/[\n.,(]/)[0].trim();
    return c || "US";
  } catch { return "US"; }
}

export async function GET() {
  return NextResponse.json({ success: true, message: "AI Visibility API working" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = body?.url || body?.domain;
    if (!url) return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });

    const domain = normalizeDomain(url);
    const brandName = cleanBrandName(body?.brandName?.trim() || domain);
    const industry = body?.industry?.trim() || detectIndustry(domain, brandName);

    // ───────── OLD competitor-discovery + Perplexity (kept) ─────────
    const prompts = [
      `Return ONLY company names. List 10 companies similar to ${brandName} in ${industry}.`,
      `Return ONLY company names. List 10 best alternatives to ${brandName} for ${industry}.`,
      `Return ONLY company names. List 10 top competitors of ${brandName} in ${industry}.`,
      `Return ONLY company names. List 10 leading brands or service providers in ${industry}.`,
      `Return ONLY company names. List 10 companies customers may compare with ${brandName} in ${industry}.`,
    ];
    const results: any[] = [];
    const brandTerms = [brandName.toLowerCase(), cleanBrandName(brandName).toLowerCase(), domain.toLowerCase(),
      cleanBrandName(domain).toLowerCase(), domain.split(".")[0].toLowerCase(), brandName.toLowerCase().replace(/\s+/g,"")].filter(Boolean);
    for (const prompt of prompts) {
      const response = await askOpenAI(prompt);
      const rt = response.toLowerCase();
      results.push({ prompt, mentioned: brandTerms.some((t)=>rt.includes(t.toLowerCase())), responseSnippet: response.slice(0,700), competitors: extractCompetitorsFromText(response, brandName, domain) });
    }
    let perplexityContent="", perplexityMentioned=false, perplexityCitations: string[]=[], perplexityCompetitors: string[]=[];
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const pr = await fetch(`${baseUrl}/api/perplexity`, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt: `Return top companies similar to ${brandName} in ${industry}. Mention whether ${domain} appears. Include competitors and sources.` }) });
      const raw = await pr.text();
      if (!raw.startsWith("<!DOCTYPE")) {
        const pd = JSON.parse(raw);
        perplexityContent = pd?.content || ""; perplexityCitations = pd?.citations || []; perplexityCompetitors = pd?.competitors || [];
        perplexityMentioned = brandTerms.some((t)=>perplexityContent.toLowerCase().includes(t.toLowerCase()));
      }
    } catch (e) { console.error("Perplexity failed:", e); }

    const totalPrompts = results.length;
    const brandMentions = results.filter((i)=>i.mentioned).length;
    const openAIScore = totalPrompts>0 ? Math.round((brandMentions/totalPrompts)*100) : 0;
    const finalScore = Math.max(0, Math.min(100, Math.round(openAIScore*0.75 + (perplexityMentioned?25:0))));
    const allCompetitors = Array.from(new Set([...results.flatMap((i)=>i.competitors||[]), ...perplexityCompetitors]))
      .map((i)=>String(i).trim()).filter(Boolean).filter((i)=>!isSelfMention(i,brandName,domain)).slice(0,10);
    const recommendations = [
      `Create stronger topical content around ${industry}.`, `Publish comparison pages against key competitors.`,
      `Improve brand mentions across trusted industry websites.`, `Add schema, FAQs, and expert author signals to strengthen AI understanding.`,
      `Build citations and backlinks from relevant ${industry} sources.`,
    ];
    const positioningInsight = finalScore<40
      ? `${brandName} has low AI visibility for ${industry}. Competitors are more likely to be recommended.`
      : finalScore<70 ? `${brandName} has moderate AI visibility for ${industry}.`
      : `${brandName} has strong AI visibility for ${industry}.`;

    // ───────── NEW: live multi-model + citations + ranked pages (A + B) ─────────
    let aiSearchVisibility: any = null;
    try {
      const incomingCompetitors: string[] = Array.isArray(body?.competitors) ? body.competitors : [];

const { prompts: nlPrompts, rankedPages, country } = await getKeywordIntel(domain, industry, brandName);

      const manualPrompts: string[] = (Array.isArray(body?.customPrompts) ? body.customPrompts : [])
        .map((p: any) => String(p || "").trim())
        .filter(Boolean);
      const finalPrompts = Array.from(new Set([...manualPrompts, ...nlPrompts])).slice(0, 5);

      const countryIso = COUNTRY_ISO[String(country || "").toLowerCase()] || "US";

      const perPrompt: any[] = await Promise.all(
        finalPrompts.map(async (prompt) => ({
          prompt,
          modelResults: await queryAllModels(prompt, countryIso),
        }))
      );

      const parsed: ParsedResponse[] = [];
      const promptResults: any[] = [];
      const citationsMap = new Map<string, Set<string>>();

      for (const { prompt, modelResults } of perPrompt) {
        const row: any = { prompt, models: {}, avgPosition: null };
        const positions: number[] = [];
        for (const mr of modelResults) {
          const p = parseResponse(mr.response, prompt, mr.model, brandName, domain, incomingCompetitors);
          parsed.push(p);
          row.models[mr.model] = { mentioned: p.brandMentioned, position: p.brandPosition, citedPage: p.brandCitations[0] || null, error: mr.error };
          if (p.brandMentioned && p.brandPosition) positions.push(p.brandPosition);
          p.brandCitations.forEach((u) => { if (!citationsMap.has(u)) citationsMap.set(u, new Set()); citationsMap.get(u)!.add(mr.model); });
        }
        row.avgPosition = positions.length ? Number((positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)) : null;
        promptResults.push(row);
      }

      const score = calculateAIVisibilityScore(parsed);

      // A: brand-knowledge probe — does AI KNOW this brand?
      const knowledgePrompt = `What do you know about "${brandName}" (the company at ${domain})? Briefly describe what products or services they offer.`;
      const kRes = await queryAllModels(knowledgePrompt, countryIso);
      const kModels: any = {};
      let knownCount = 0;
      kRes.forEach((mr) => {
        const knows = knowsBrand(mr.response, brandName, domain);
        if (knows) knownCount++;
        const cites = extractBrandCitations(mr.response, domain);
        cites.forEach((u) => { if (!citationsMap.has(u)) citationsMap.set(u, new Set()); citationsMap.get(u)!.add(mr.model); });
        kModels[mr.model] = { knows, snippet: (mr.response || "").slice(0, 240), citedPage: cites[0] || null };
      });
      const validK = kRes.filter((m) => m.response).length || 1;
      const brandKnowledge = {
        score: Math.round((knownCount / validK) * 100),
        knownBy: kRes.filter((m) => kModels[m.model]?.knows).map((m) => m.model),
        models: kModels,
      };

      const citations = Array.from(citationsMap.entries()).map(([url, models]) => ({ url, models: Array.from(models) }));
      const modelsCalled = Array.from(new Set(perPrompt.flatMap((pp: any) => pp.modelResults.filter((m: any) => m.response).map((m: any) => m.model))));

      aiSearchVisibility = {
        ...score, promptResults, brandKnowledge, citations, rankedPages, country,
        totalPrompts: finalPrompts.length, modelsCalled, brand: brandName, industry,
        source: "Live AI Models (ChatGPT, Claude, Gemini)",
      };
      console.log("[ai-visibility] DONE — prompts:", promptResults.length, "knowledge:", brandKnowledge.score, "citations:", citations.length, "pages:", rankedPages.length, "country:", country);
    } catch (err) {
      console.error("Multi-model AI visibility failed:", err);
      aiSearchVisibility = null;
    }

    return NextResponse.json({
      success: true,
      aiSearchVisibility,
      aiVisibility: {
        brandName, domain, industry, score: finalScore, totalPrompts, brandMentions, perplexityMentioned,
        results, competitors: allCompetitors, positioningInsight, aiRecommendations: recommendations,
        perplexity: { mentioned: perplexityMentioned, content: perplexityContent, citations: perplexityCitations, competitors: perplexityCompetitors },
      },
    });
  } catch (error) {
    console.error("AI visibility error:", error);
    return NextResponse.json({ success: false, error: "AI visibility failed" }, { status: 500 });
  }
}