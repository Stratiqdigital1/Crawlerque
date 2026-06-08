type ExtractInput = {
  brandName: string;
  prompt: string;
  response: string;
};

export type ExtractedVisibility = {
  brandMentioned: boolean;
  brandRank: number | null;
  competitors: string[];
  summary: string;
};

export async function extractVisibilityData({
  brandName,
  prompt,
  response,
}: ExtractInput): Promise<ExtractedVisibility> {
  const { runAIQuery } = await import("@/lib/ai");

  const extractionPrompt = `
You are extracting AI search visibility data from an AI-generated answer.

Brand Name: ${brandName}
User Prompt: ${prompt}

AI Response:
"""
${response}
"""

Return JSON only:
{
  "brandMentioned": true,
  "brandRank": 1,
  "competitors": ["Competitor A", "Competitor B"],
  "summary": "short summary"
}

Rules:
- brandMentioned = true only if the brand is explicitly mentioned
- brandRank = the brand's ranking position if clearly present in a ranked/recommended list, otherwise null
- competitors = only explicitly mentioned competing brands/companies
- summary = concise factual summary
`;

  const result = await runAIQuery(extractionPrompt);

  const parsed =
    typeof result === "string" ? JSON.parse(result) : result;

  return {
    brandMentioned: Boolean(parsed.brandMentioned),
    brandRank:
      typeof parsed.brandRank === "number" ? parsed.brandRank : null,
    competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
    summary: parsed.summary || "",
  };
}