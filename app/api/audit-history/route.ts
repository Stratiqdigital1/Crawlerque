import { NextResponse } from "next/server";

let auditHistory: any[] = [];

export async function GET() {
  return NextResponse.json({
    success: true,
    audits: auditHistory,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const audit = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      domain: body.domain,
      overallScore: body.overallScore,
      seoScore: body.seoScore,
      speedScore: body.speedScore,
      uxScore: body.uxScore,
      aiVisibilityScore: body.aiVisibility?.score ?? 0,
      report: body,
    };

    auditHistory.unshift(audit);

    return NextResponse.json({
      success: true,
      audit,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to save audit" },
      { status: 500 }
    );
  }
}