import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const prompt = `
You are an expert website audit strategist.

Analyze this real website audit data and return JSON only.

Required JSON shape:
{
  "summary": "string",
  "topFindings": ["string", "string", "string"],
  "recommendations": ["string", "string", "string"]
}

Audit data:
Domain: ${body.domain}
Overall Health Score: ${body.overallHealth}
SEO Score: ${body.seoScore}
Performance Score: ${body.pageSpeedScore}
UX Score: ${body.uxScore}
Critical Errors: ${body.criticalErrors}
Warnings: ${body.warnings}
Top Issues: ${JSON.stringify(body.topIssues ?? [])}
Existing Recommendations: ${JSON.stringify(body.recommendations ?? [])}

Rules:
- Summary should be concise and strategic
- Findings must reflect the actual audit data
- Recommendations must be practical and action-oriented
- No markdown
- Return valid JSON only
`;

    const response = await client.responses.create({
      model: "gpt-5.4-mini",
      input: prompt,
    });

    const rawText = response.output_text || "{}";
    const parsed = JSON.parse(rawText);

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error("Audit insights error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate AI insights",
      },
      { status: 500 }
    );
  }
}