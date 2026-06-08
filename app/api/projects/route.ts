import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
  orderBy: {
    createdAt: "desc",
  },
});

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Fetch projects error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch projects",
      },
      { status: 500 }
    );
  }
}