// lib/ai-visibility-score.ts
// ---------------------------------------------------------------------------
// Turns an array of ParsedResponse rows into a single AI Visibility score
// plus breakdowns used by the dashboard and PDF.
//
// Formula:
//   visibilityRate = (prompts with mention / total) * 100
//   positionScore  = (5 - avgPosition) / 4 * 100   (pos 1 = 100, pos 5+ = 0)
//   sentimentScore = (positive mentions / total mentions) * 100
//   overallScore   = visibilityRate*0.5 + positionScore*0.3 + sentimentScore*0.2
// ---------------------------------------------------------------------------

import type { ParsedResponse } from "./ai-visibility-parser";

export interface AIVisibilityScore {
  overallScore: number;
  visibilityRate: number;
  avgPosition: number;
  sentimentScore: number;
  modelBreakdown: { chatgpt: number; claude: number; gemini: number };
  topPrompts: string[];
  missedPrompts: string[];
  topCompetitors: string[];
}

export function calculateAIVisibilityScore(results: ParsedResponse[]): AIVisibilityScore {
  const total = results.length;

  if (total === 0) {
    return {
      overallScore: 0,
      visibilityRate: 0,
      avgPosition: 0,
      sentimentScore: 0,
      modelBreakdown: { chatgpt: 0, claude: 0, gemini: 0 },
      topPrompts: [],
      missedPrompts: [],
      topCompetitors: [],
    };
  }

  const mentions = results.filter((r) => r.brandMentioned);
  const visibilityRate = Math.round((mentions.length / total) * 100);

  const positions = mentions.map((r) => r.brandPosition || 5);
  const avgPosition = positions.length
    ? Number((positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1))
    : 0;

  const positionScore = positions.length
    ? Math.max(0, Math.min(100, ((5 - avgPosition) / 4) * 100))
    : 0;

  const sentimentScore = mentions.length
    ? Math.round(
        (mentions.filter((r) => r.sentiment === "positive").length / mentions.length) * 100
      )
    : 0;

  const overallScore = Math.round(
    visibilityRate * 0.5 + positionScore * 0.3 + sentimentScore * 0.2
  );

  // Per-model visibility %
  const perModel = (name: string) => {
    const rows = results.filter((r) => r.model.toLowerCase().includes(name));
    if (!rows.length) return 0;
    return Math.round((rows.filter((r) => r.brandMentioned).length / rows.length) * 100);
  };

  // Prompts where the brand ranked #1 (best wins)
  const topPrompts = Array.from(
    new Set(mentions.filter((r) => r.brandPosition === 1).map((r) => r.promptText))
  );

  // Prompts where the brand was missed by EVERY model
  const hitByPrompt = new Map<string, boolean>();
  results.forEach((r) => {
    hitByPrompt.set(r.promptText, (hitByPrompt.get(r.promptText) || false) || r.brandMentioned);
  });
  const missedPrompts = Array.from(hitByPrompt.entries())
    .filter(([, hit]) => !hit)
    .map(([p]) => p);

  // Most frequently mentioned competitors across all responses
  const compMap = new Map<string, number>();
  results.forEach((r) =>
    r.competitorsMentioned.forEach((c) => compMap.set(c, (compMap.get(c) || 0) + 1))
  );
  const topCompetitors = Array.from(compMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);

  return {
    overallScore,
    visibilityRate,
    avgPosition,
    sentimentScore,
    modelBreakdown: {
      chatgpt: perModel("chatgpt"),
      claude: perModel("claude"),
      gemini: perModel("gemini"),
    },
    topPrompts,
    missedPrompts,
    topCompetitors,
  };
}