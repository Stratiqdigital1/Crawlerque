import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const packages = await prisma.package.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, packages });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();

  const pkg = await prisma.package.create({
    data: {
      name: body.name,
      monthlyAudits: Number(body.monthlyAudits || 5),
      allowPdf: Boolean(body.allowPdf),
      allowAi: Boolean(body.allowAi),
      allowTraffic: Boolean(body.allowTraffic),
      allowKeywords: Boolean(body.allowKeywords),
      allowBacklinks: Boolean(body.allowBacklinks),
      allowLocalSeo: Boolean(body.allowLocalSeo),
      allowWhiteLabel: Boolean(body.allowWhiteLabel),
    },
  });

  return NextResponse.json({ success: true, package: pkg });
}