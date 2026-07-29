import type { ParsedResponse } from "./ai-visibility-parser";

export interface AIVisibilityScore {
  overallScore: number;
  visibilityRate: number;
  avgPosition: number | null;
  positionScore: number;
  sentimentScore: number;
  confidence: "high" | "moderate" | "low";
  validResponseCount: number;
  expectedResponseCount: number;
  modelBreakdown: { chatgpt: number; claude: number; gemini: number };
  topPrompts: string[];
  missedPrompts: string[];
  topCompetitors: string[];
  brandMentionCount: number;
  competitorMentionCount: number;
  shareOfVoice: number;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function calculateAIVisibilityScore(results: ParsedResponse[]): AIVisibilityScore {
  const expectedResponseCount = results.length;
  const validResults = results.filter((result) => result.responseAvailable);
  const validResponseCount = validResults.length;

  if (validResponseCount === 0) {
    return {
      overallScore: 0,
      visibilityRate: 0,
      avgPosition: null,
      positionScore: 0,
      sentimentScore: 0,
      confidence: "low",
      validResponseCount,
      expectedResponseCount,
      modelBreakdown: { chatgpt: 0, claude: 0, gemini: 0 },
      topPrompts: [],
      missedPrompts: [],
      topCompetitors: [],
      brandMentionCount: 0,
      competitorMentionCount: 0,
      shareOfVoice: 0,
    };
  }

  const mentions = validResults.filter((result) => result.brandMentioned);
  const brandMentionCount = mentions.length;
  const visibilityRate = Math.round((brandMentionCount / validResponseCount) * 100);

  const positions = mentions
    .map((result) => result.brandPosition)
    .filter((position): position is number => Number.isFinite(position))
    .map((position) => clamp(position, 1, 5));

  const avgPosition = positions.length
    ? Number((positions.reduce((sum, position) => sum + position, 0) / positions.length).toFixed(1))
    : null;

  const positionScore = avgPosition === null
    ? 0
    : Math.round(clamp(((5 - avgPosition) / 4) * 100));

  // Positive = 100, neutral = 60 and negative = 0. Neutral wording should not
  // be treated as a complete failure.
const sentimentValues: number[] =
  mentions.map((result) => {
    if (
      result.sentiment === "positive"
    ) {
      return 100;
    }

    if (
      result.sentiment === "negative"
    ) {
      return 0;
    }

    return 50;
  });

const sentimentScore =
  sentimentValues.length > 0
    ? Math.round(
        sentimentValues.reduce<number>(
          (sum, value) =>
            sum + value,
          0
        ) /
          sentimentValues.length
      )
    : 0;

  const overallScore = Math.round(
    visibilityRate * 0.6 +
    positionScore * 0.25 +
    sentimentScore * 0.15
  );

  const responseCoverage = validResponseCount / Math.max(1, expectedResponseCount);
  const distinctModels = new Set(validResults.map((result) => result.model.toLowerCase())).size;
  const distinctPrompts = new Set(validResults.map((result) => result.promptText)).size;

  const confidence =
    responseCoverage >= 0.85 && distinctModels >= 3 && distinctPrompts >= 4
      ? "high"
      : responseCoverage >= 0.6 && distinctModels >= 2 && distinctPrompts >= 3
        ? "moderate"
        : "low";

  const perModel = (modelName: string) => {
    const rows = validResults.filter((result) =>
      result.model.toLowerCase().includes(modelName)
    );

    return rows.length
      ? Math.round((rows.filter((result) => result.brandMentioned).length / rows.length) * 100)
      : 0;
  };

  const promptHits = new Map<string, { hit: boolean; bestPosition: number | null }>();
  validResults.forEach((result) => {
    const existing = promptHits.get(result.promptText) || { hit: false, bestPosition: null };
    const nextPosition = result.brandPosition
      ? Math.min(existing.bestPosition ?? 5, result.brandPosition)
      : existing.bestPosition;

    promptHits.set(result.promptText, {
      hit: existing.hit || result.brandMentioned,
      bestPosition: nextPosition,
    });
  });

  const topPrompts = Array.from(promptHits.entries())
    .filter(([, value]) => value.hit)
    .sort((a, b) => (a[1].bestPosition ?? 5) - (b[1].bestPosition ?? 5))
    .slice(0, 5)
    .map(([prompt]) => prompt);

  const missedPrompts = Array.from(promptHits.entries())
    .filter(([, value]) => !value.hit)
    .map(([prompt]) => prompt);

  const competitorCounts = new Map<string, number>();
  validResults.forEach((result) => {
    result.competitorsMentioned.forEach((competitor) => {
      competitorCounts.set(competitor, (competitorCounts.get(competitor) || 0) + 1);
    });
  });

  const topCompetitors = Array.from(competitorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([competitor]) => competitor);

  const competitorMentionCount = Array.from(competitorCounts.values())
    .reduce((sum, value) => sum + value, 0);

  const shareOfVoiceDenominator = brandMentionCount + competitorMentionCount;
  const shareOfVoice = shareOfVoiceDenominator > 0
    ? Math.round((brandMentionCount / shareOfVoiceDenominator) * 100)
    : 0;

  return {
    overallScore: clamp(overallScore),
    visibilityRate,
    avgPosition,
    positionScore,
    sentimentScore,
    confidence,
    validResponseCount,
    expectedResponseCount,
    modelBreakdown: {
      chatgpt: perModel("chatgpt"),
      claude: perModel("claude"),
      gemini: perModel("gemini"),
    },
    topPrompts,
    missedPrompts,
    topCompetitors,
    brandMentionCount,
    competitorMentionCount,
    shareOfVoice,
  };
}
