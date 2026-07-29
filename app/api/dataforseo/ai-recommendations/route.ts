import { NextResponse } from "next/server";
import {
  buildEvidenceBackedRecommendations,
} from "@/lib/recommendation-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  return NextResponse.json({
    success: true,
    message:
      "Evidence-backed recommendations API is working. Use POST with reconciled audit data.",
  });
}

export async function POST(req: Request) {
  try {
    let body: unknown = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const result = buildEvidenceBackedRecommendations(body);

    return NextResponse.json({
      success: true,
      aiRecommendations: {
        recommendations: result.recommendations,
        roadmap: result.roadmap,
        businessType: result.businessType,
        filteredKeywordGaps: result.filteredKeywordGaps,
        suppressedCompetitorBrandedKeywords:
          result.suppressedCompetitorBrandedKeywords,
        source: result.source,
        methodologyVersion: result.methodologyVersion,
        fullResponse: "",
      },
    });
  } catch (error) {
    console.error(
      "Evidence-backed recommendations route failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Recommendations could not be generated.",
      },
      { status: 500 }
    );
  }
}
