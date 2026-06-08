import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!project) {
      return NextResponse.json({
        success: true,
        project: null,
        prompts: [],
        results: [],
        stats: {
          totalPrompts: 0,
          brandMentions: 0,
          visibilityScore: 0,
          shareOfVoice: 0,
          averageRank: null,
        },
      });
    }

    const prompts = Array.isArray(project.prompts)
      ? (project.prompts as any[])
      : [];

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        domain,
      },
      prompts,
      results: [],
      stats: {
        totalPrompts: prompts.length,
        brandMentions: 0,
        visibilityScore: 0,
        shareOfVoice: 0,
        averageRank: null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch AI results" },
      { status: 500 }
    );
  }
}