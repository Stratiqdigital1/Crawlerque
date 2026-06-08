import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("stratiq_session")?.value;
  if (!token) return null;
  try {
    const payload: any = await verifySessionToken(token);
    if (payload?.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getAdminUser();

  if (!user) {
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
  const user = await getAdminUser();

  if (!user) {
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