import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("stratiq_session")?.value;
  const session: any = token ? await verifySessionToken(token) : null;

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      agencyName: true,
      companyName: true,
      brandColor: true,
      brandLogoUrl: true,
      pdfFooterText: true,
      whiteLabelEnabled: true,
      package: { select: { allowWhiteLabel: true } },
    },
  });

  return NextResponse.json({ success: true, settings: user });
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("stratiq_session")?.value;
  const session: any = token ? await verifySessionToken(token) : null;

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { package: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();

  // White-label fields are only writable if the package allows it
  const canWhiteLabel =
    user.role === "admin" || user.package?.allowWhiteLabel === true;

  const updateData: Record<string, any> = {
    name: body.name ?? user.name,
    companyName: body.companyName ?? user.companyName,
  };

  if (canWhiteLabel) {
    updateData.agencyName = body.agencyName ?? user.agencyName;
    updateData.brandColor = body.brandColor ?? user.brandColor;
    updateData.brandLogoUrl = body.brandLogoUrl ?? user.brandLogoUrl;
    updateData.pdfFooterText = body.pdfFooterText ?? user.pdfFooterText;
    updateData.whiteLabelEnabled =
      body.whiteLabelEnabled !== undefined
        ? Boolean(body.whiteLabelEnabled)
        : user.whiteLabelEnabled;
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: updateData,
    select: {
      name: true,
      email: true,
      agencyName: true,
      companyName: true,
      brandColor: true,
      brandLogoUrl: true,
      pdfFooterText: true,
      whiteLabelEnabled: true,
    },
  });

  return NextResponse.json({ success: true, settings: updated });
}