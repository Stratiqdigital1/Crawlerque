import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.brandName || !body.domain) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, brandName, and domain are required",
        },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
  data: {
    prompts: [],
  },
});

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create project",
      },
      { status: 500 }
    );
  }
}