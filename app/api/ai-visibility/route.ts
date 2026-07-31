import { NextResponse } from "next/server";
import { queryAllModels } from "./query/route";
import { getKeywordIntel } from "./prompts/route";
import {
  extractBrandCitations,
  knowsBrand,
  parseResponse,
  type ParsedResponse,
} from "@/lib/ai-visibility-parser";
import { calculateAIVisibilityScore } from "@/lib/ai-visibility-score";

export const maxDuration = 120;

const MODEL_ROSTER = ["ChatGPT", "Claude", "Gemini"] as const;

function normalizeDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return String(value || "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0]
      .toLowerCase();
  }
}

function cleanBrandName(value: string) {
  return String(value || "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|net|org|io|co|ai|us|pk|uk|ca|ae|au|in)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedComparable(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function containsBrand(value: string, brandName: string, domain: string) {
  const comparable = normalizedComparable(value);
  const brand = normalizedComparable(brandName);
  const domainRoot = normalizedComparable(normalizeDomain(domain).split(".")[0]);

  return Boolean(
    comparable &&
    ((brand.length >= 3 && comparable.includes(brand)) ||
      (domainRoot.length >= 3 && comparable.includes(domainRoot)))
  );
}

function cleanCategoryCandidate(value: string, brandName: string, domain: string) {
  const cleaned = String(value || "")
    .replace(/^https?:\/\//i, "")
    .replace(/\s+/g, " ")
    .replace(/[|–—:]+.*$/, "")
    .trim();

  if (!cleaned || cleaned.length < 4 || cleaned.length > 90) return "";
  if (containsBrand(cleaned, brandName, domain)) return "";
  if (/^(home|login|contact|about|official site|website)$/i.test(cleaned)) return "";

  return cleaned;
}

function deriveCategory(input: {
  categoryKeywords: unknown;
  industry: string;
  brandName: string;
  domain: string;
}) {
  const keywordCandidates = Array.isArray(input.categoryKeywords)
    ? input.categoryKeywords
        .map((keyword) => cleanCategoryCandidate(String(keyword || ""), input.brandName, input.domain))
        .filter(Boolean)
    : [];

  if (keywordCandidates.length > 0) {
    // A ranked, non-branded category keyword is more defensible than a tagline
    // or homepage title supplied as the industry.
    return keywordCandidates[0];
  }

  const industry = cleanCategoryCandidate(input.industry, input.brandName, input.domain);
  return industry || "products and services in this market";
}

function buildNeutralPrompts(
  category: string,
  country: string
) {
  const market =
    country && country !== "US"
      ? ` in ${country}`
      : "";

  return [
    `Which companies are considered the best for ${category}${market}?`,
    `Which ${category} providers are most trusted${market}?`,
    `Recommend leading companies that specialize in ${category}${market}.`,
    `What should a business look for when choosing a ${category} partner${market}?`,
    `Which companies are commonly compared for ${category}${market}?`,
  ];
}

function categoryTokens(value: string) {
  const stopWords = new Set([
    "best",
    "company",
    "companies",
    "provider",
    "providers",
    "service",
    "services",
    "solution",
    "solutions",
    "for",
    "and",
    "the",
    "with",
  ]);

  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length >= 4 &&
        !stopWords.has(token)
    );
}

function isPromptRelevantToCategory(
  prompt: string,
  category: string
) {
  const promptText = String(
    prompt || ""
  ).toLowerCase();

  const tokens = categoryTokens(
    category
  );

  if (tokens.length === 0) {
    return true;
  }

  const matches = tokens.filter(
    (token) =>
      promptText.includes(token)
  ).length;

  return matches >= Math.min(2, tokens.length);
}

function cleanCompetitorCandidate(
  value: string,
  brandName: string,
  domain: string
) {
  const cleaned = String(value || "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[|–—:]+.*$/, "")
    .replace(/^[^a-z0-9]+|[^a-z0-9.\- ]+$/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    !cleaned ||
    cleaned.length < 3 ||
    containsBrand(
      cleaned,
      brandName,
      domain
    )
  ) {
    return "";
  }

  const blocked =
    /^(ehr|emr|look|create|optimize|optimise|seo|software|platform|solution|solutions|service|services|company|companies|provider|providers|healthcare|medical|technology|tech|content|marketing|search|website|brand|brands|best|top|tools?|strong)$/i;

const blockedGenericPhrase =
  /^(user[-\s]?friendly interface|customi[sz]ation options?|systems?|ehrs?|emrs?|features?|functionality|integration|interoperability|workflow|security|support|pricing)$/i;

if (
  blocked.test(cleaned) ||
  blockedGenericPhrase.test(cleaned)
) {
  return "";
}

  return cleaned;
}

function countryIso(country: string) {
  const map: Record<string, string> = {
    pakistan: "PK",
    india: "IN",
    bangladesh: "BD",
    "united kingdom": "GB",
    uk: "GB",
    england: "GB",
    australia: "AU",
    canada: "CA",
    uae: "AE",
    "united arab emirates": "AE",
    dubai: "AE",
    "united states": "US",
    us: "US",
    usa: "US",
    america: "US",
  };

  return map[String(country || "").toLowerCase()] || "US";
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "AI Visibility API working",
    models: MODEL_ROSTER,
    methodologyVersion: "2.0",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputUrl = String(body?.url || body?.domain || "").trim();

    if (!inputUrl) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const domain = normalizeDomain(inputUrl);
    const brandName = cleanBrandName(body?.brandName || domain);
    const incomingCompetitors: string[] = Array.isArray(body?.competitors)
      ? body.competitors.map((competitor: unknown) => String(competitor || "").trim()).filter(Boolean)
      : [];

    const category = deriveCategory({
      categoryKeywords: body?.categoryKeywords,
      industry: String(body?.industry || ""),
      brandName,
      domain,
    });

    let rankedPages: unknown[] = [];
    let generatedPrompts: string[] = [];
    let detectedCountry = String(body?.country || body?.locationName || "").trim();
    const selectedLanguageName =
      String(body?.languageName || "English");
    const selectedLanguageCode =
      String(body?.languageCode || "en");
    const selectedLocationCode =
      Number(body?.locationCode || 0) ||
      undefined;

    try {
      const keywordIntel = await getKeywordIntel(
        domain,
        category,
        brandName,
        {
          country: detectedCountry,
          locationCode:
            selectedLocationCode,
          languageName:
            selectedLanguageName,
          languageCode:
            selectedLanguageCode,
        }
      );
      rankedPages = Array.isArray(keywordIntel?.rankedPages) ? keywordIntel.rankedPages : [];
      generatedPrompts = Array.isArray(keywordIntel?.prompts)
        ? keywordIntel.prompts
        : [];
      detectedCountry = detectedCountry || String(keywordIntel?.country || "US");
    } catch (error) {
      console.error("AI keyword context failed:", error);
      detectedCountry = detectedCountry || "US";
    }

    const customPrompts = Array.isArray(body?.customPrompts)
      ? body.customPrompts
          .map((prompt: unknown) => String(prompt || "").trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];

    const neutralCustomPrompts = customPrompts.filter(
      (prompt: string) => !containsBrand(prompt, brandName, domain)
    );

    const brandedCustomPrompts = customPrompts.filter(
      (prompt: string) => containsBrand(prompt, brandName, domain)
    );

    const categorySource =
      String(
        body?.categorySource || ""
      ).toLowerCase();

    const relevantGeneratedPrompts =
      generatedPrompts.filter(
        (prompt) =>
          isPromptRelevantToCategory(
            prompt,
            category
          )
      );

    const categoryPrompts =
      categorySource ===
        "homepage-context"
        ? buildNeutralPrompts(
            category,
            detectedCountry
          )
        : relevantGeneratedPrompts.length >= 3
          ? relevantGeneratedPrompts
          : buildNeutralPrompts(
              category,
              detectedCountry
            );

const scoredPrompts = uniqueStrings([
  ...neutralCustomPrompts,
  ...categoryPrompts,
]).slice(0, 3);

    const iso = countryIso(detectedCountry);
    const promptRuns = await Promise.all(
      scoredPrompts.map(async (prompt) => ({
        prompt,
        modelResults: await queryAllModels(prompt, iso),
      }))
    );

    const parsedResponses: ParsedResponse[] = [];
    const promptResults: Array<Record<string, unknown>> = [];
    const citationsMap = new Map<string, Set<string>>();

    for (const { prompt, modelResults } of promptRuns) {
      const row: Record<string, unknown> = {
        prompt,
        scored: true,
        models: {},
        avgPosition: null,
      };

      const positions: number[] = [];
      const modelRows: Record<string, unknown> = {};

      for (const modelResult of modelResults) {
        const parsed = parseResponse(
          modelResult.response,
          prompt,
          modelResult.model,
          brandName,
          domain,
          incomingCompetitors
        );

        parsedResponses.push(parsed);

        modelRows[modelResult.model] = {
          available: parsed.responseAvailable,
          mentioned: parsed.brandMentioned,
          position: parsed.brandPosition,
          sentiment: parsed.sentiment,
          citedPage: parsed.brandCitations[0] || null,
          competitors: uniqueStrings(
            (
              parsed.competitorsMentioned ||
              []
            )
              .map((value: string) =>
                cleanCompetitorCandidate(
                  value,
                  brandName,
                  domain
                )
              )
              .filter(Boolean)
          ),
          sources: parsed.sourcesCited,
          snippet: parsed.rawSnippet,
          error: modelResult.error || null,
        };

        if (parsed.brandMentioned && parsed.brandPosition) {
          positions.push(parsed.brandPosition);
        }

        parsed.brandCitations.forEach((url) => {
          if (!citationsMap.has(url)) citationsMap.set(url, new Set());
          citationsMap.get(url)?.add(modelResult.model);
        });
      }

      row.models = modelRows;
      row.avgPosition = positions.length
        ? Number((positions.reduce((sum, position) => sum + position, 0) / positions.length).toFixed(1))
        : null;

      promptResults.push(row);
    }

    const score = calculateAIVisibilityScore(
      parsedResponses
    );

    const cleanedTopCompetitors =
      uniqueStrings(
        [
          ...(Array.isArray(
            (score as any)
              ?.topCompetitors
          )
            ? (score as any)
                .topCompetitors
            : []),
          ...parsedResponses.flatMap(
            (response: any) =>
              Array.isArray(
                response
                  ?.competitorsMentioned
              )
                ? response
                    .competitorsMentioned
                : []
          ),
        ]
          .map((value: string) =>
            cleanCompetitorCandidate(
              value,
              brandName,
              domain
            )
          )
          .filter(Boolean)
      ).slice(0, 10);

    // Brand knowledge is useful evidence, but it is intentionally excluded from
    // the market visibility score because this prompt names the audited brand.
    const knowledgePrompt =
      `What do you know about "${brandName}" (the company at ${domain})? ` +
      "Briefly describe its products or services and cite sources when possible.";

    const knowledgeResults = await queryAllModels(knowledgePrompt, iso);
    const knowledgeModels: Record<string, unknown> = {};
    let knownCount = 0;
    let validKnowledgeResponses = 0;

    knowledgeResults.forEach((modelResult) => {
      const responseAvailable = String(modelResult.response || "").trim().length >= 20;
      const knows = responseAvailable && knowsBrand(modelResult.response, brandName, domain);
      const citations = responseAvailable
        ? extractBrandCitations(modelResult.response, domain)
        : [];

      if (responseAvailable) validKnowledgeResponses += 1;
      if (knows) knownCount += 1;

      citations.forEach((url) => {
        if (!citationsMap.has(url)) citationsMap.set(url, new Set());
        citationsMap.get(url)?.add(modelResult.model);
      });

      knowledgeModels[modelResult.model] = {
        available: responseAvailable,
        knows,
        snippet: String(modelResult.response || "").slice(0, 320),
        citedPage: citations[0] || null,
        error: modelResult.error || null,
      };
    });

    const brandKnowledge = {
      scored: false,
      reason: "Brand-named probe is evidence only and is excluded from the market visibility score.",
      score: validKnowledgeResponses > 0
        ? Math.round((knownCount / validKnowledgeResponses) * 100)
        : 0,
      knownBy: knowledgeResults
        .filter((result) => (knowledgeModels[result.model] as { knows?: boolean })?.knows)
        .map((result) => result.model),
      models: knowledgeModels,
    };

    // Brand-containing custom prompts remain available as clearly labelled
    // evidence, but cannot inflate the standard score.
    const customEvidence = await Promise.all(
      brandedCustomPrompts.slice(0, 2).map(async (prompt: string) => ({
        prompt,
        scored: false,
        reason: "The prompt contains the audited brand and is excluded from scoring.",
        modelResults: await queryAllModels(prompt, iso),
      }))
    );

    const citations = Array.from(citationsMap.entries()).map(([url, models]) => ({
      url,
      models: Array.from(models),
    }));

    const modelsCalled = uniqueStrings(
      promptRuns.flatMap((run) =>
        run.modelResults
          .filter((result) => String(result.response || "").trim().length >= 20)
          .map((result) => result.model)
      )
    );

    const aiSearchVisibility = {
      ...score,
      topCompetitors:
        cleanedTopCompetitors,
      categorySource:
        String(
          body?.categorySource ||
            "derived"
        ),
      methodologyVersion: "2.0",
      methodology: {
        scoredPromptRule: "Only unbranded category prompts are included in the score.",
        brandKnowledgeRule: "Brand-named knowledge probes are evidence only.",
        formula: "Visibility 60% + average position 25% + sentiment 15%.",
        positionScale: "1 to 5; values beyond fifth place are capped at 5.",
        modelRoster: MODEL_ROSTER,
      },
      promptResults,
      customEvidence,
      brandKnowledge,
      citations,
      rankedPages,
      country: detectedCountry,
      countryIso: iso,
      locationCode:
        selectedLocationCode || null,
      languageName:
        selectedLanguageName,
      languageCode:
        selectedLanguageCode,
      device:
        body?.device === "desktop"
          ? "desktop"
          : "mobile",
      searchEngine:
        String(body?.searchEngine || "google"),
      totalPrompts: scoredPrompts.length,
      modelsCalled,
      modelsExpected: MODEL_ROSTER,
      brand: brandName,
      domain,
      industry: category,
      source: "Live AI Models (ChatGPT, Claude, Gemini)",
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      aiSearchVisibility,
      // Compatibility alias. It contains the same canonical methodology and no
      // Perplexity or legacy brand-biased score.
      aiVisibility: aiSearchVisibility,
    });
  } catch (error) {
    console.error("AI visibility error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "AI visibility analysis could not be completed.",
      },
      { status: 500 }
    );
  }
}
