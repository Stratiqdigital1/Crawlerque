import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const existing = await prisma.project.findFirst({
  orderBy: {
    createdAt: "desc",
  },
});

    if (existing) {
      return NextResponse.json({
        success: true,
        project: existing,
        message: "Default project already exists",
      });
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
    console.error("Setup project error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create default project",
      },
      { status: 500 }
    );
  }
}