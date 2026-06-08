import { guessBrandFromDomain } from "./domain";
import { runAIQuery } from "@/lib/ai";

type BrandDetectionResult = {
  brandName: string;
  reasoning?: string;
};

export async function detectBrandName(domain: string): Promise<string> {
  const fallback = guessBrandFromDomain(domain);

  try {
    const prompt = `
You are identifying the brand name behind a website domain.

Domain: ${domain}

Return JSON only:
{
  "brandName": "string",
  "reasoning": "string"
}

Rules:
- brandName must be the likely public-facing brand/company name
- do not include TLDs like .com
- keep it concise
`;

    const result = await runAIQuery(prompt);

    const parsed: BrandDetectionResult =
      typeof result === "string" ? JSON.parse(result) : result;

    return parsed.brandName?.trim() || fallback;
  } catch {
    return fallback;
  }
}