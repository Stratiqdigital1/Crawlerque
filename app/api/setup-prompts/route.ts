import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Setup prompts skipped. Prisma database is not connected yet.",
    project: null,
    prompts: [],
  });
}