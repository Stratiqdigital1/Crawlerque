import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content:
              "You are an SEO expert. Always list companies clearly. Mention competitors explicitly. Include sources.",
          },
          { role: "user", content: prompt },
        ],
        return_citations: true,
      }),
    });

    const data = await response.json();

    // ✅ SINGLE DEFINITIONS (NO DUPLICATES)
    const content = data?.choices?.[0]?.message?.content || "";

    const citations =
      data?.citations?.map((c: any) => c.url || c.title) || [];

    // 🔥 SMART COMPETITOR EXTRACTION
    const competitorMatches =
      content.match(
        /\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*(?:\s(Digital|Agency|Marketing)))\b/g
      ) || [];

    const competitors = [...new Set(competitorMatches)].slice(0, 10);

    return NextResponse.json({
      content,
      citations,
      competitors,
    });
  } catch (error) {
    console.error("Perplexity API error:", error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}