import { NextResponse } from "next/server";

async function askGemini(prompt: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return "Gemini API key missing.";
    }

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Google AI Mode Gemini error:", data);
      return "Google AI Mode insight unavailable.";
    }

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Google AI Mode insight unavailable."
    );
  } catch (error) {
    console.error("Google AI Mode route failed:", error);
    return "Google AI Mode insight unavailable.";
  }
}

function cleanBrandName(input: string) {
  return input
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|net|org|io|co|us|uk|de|ca|au)$/i, "")
    .replace(/[-_]/g, " ")
    .trim();
}

function normalizeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = body?.url;
    const brandName = body?.brandName || cleanBrandName(normalizeDomain(url || ""));

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const domain = normalizeDomain(url);

    const prompts = [
      `In a Google AI Mode style answer, recommend the best companies similar to ${brandName}. Include helpful web-style reasoning. Return whether ${brandName} appears.`,
      `In a Google AI Search experience, compare top options in the same category as ${brandName}. Mention competitors and whether ${brandName} should be included.`,
      `Simulate how Google AI Mode might answer: "best alternatives to ${brandName}". Return recommended brands and short reasoning.`,
      `Simulate query fan-out for ${brandName}: category, competitors, buyer intent, and brand visibility. Return concise findings.`,
    ];

    const results = [];

    for (const prompt of prompts) {
      const response = await askGemini(prompt);
      const responseText = response.toLowerCase();

      const brandVariants = [
        brandName.toLowerCase(),
        cleanBrandName(brandName).toLowerCase(),
        domain.toLowerCase(),
        cleanBrandName(domain).toLowerCase(),
        brandName.toLowerCase().replace(/\s+/g, ""),
      ].filter(Boolean);

      const mentioned = brandVariants.some((variant) =>
        responseText.includes(variant)
      );

      results.push({
        prompt,
        mentioned,
        responseSnippet: response.slice(0, 700),
      });
    }

    const totalPrompts = results.length;
    const brandMentions = results.filter((item) => item.mentioned).length;
    const score =
      totalPrompts > 0 ? Math.round((brandMentions / totalPrompts) * 100) : 0;

    const summaryPrompt = `
You are analyzing simulated Google AI Mode visibility.

Brand: ${brandName}
Domain: ${domain}
Score: ${score}%
Mentions: ${brandMentions}/${totalPrompts}

Responses:
${results.map((r, i) => `Prompt ${i + 1}: ${r.responseSnippet}`).join("\n\n")}

Return:
- Google AI Mode Visibility Summary
- Why the brand appears or does not appear
- 3 practical actions to improve visibility
`;

    const summary = await askGemini(summaryPrompt);

    return NextResponse.json({
      success: true,
      googleAIMode: {
        brandName,
        domain,
        score,
        totalPrompts,
        brandMentions,
        summary,
        results,
      },
    });
  } catch (error) {
    console.error("Google AI Mode failed:", error);

    return NextResponse.json(
      { success: false, error: "Google AI Mode failed" },
      { status: 500 }
    );
  }
}