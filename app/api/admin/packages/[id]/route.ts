import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const pkg = await prisma.package.update({
    where: { id },
    data: {
      ...(body.monthlyAudits !== undefined && { monthlyAudits: Number(body.monthlyAudits) }),
      ...(body.priceMonthly  !== undefined && { priceMonthly:  Number(body.priceMonthly) }),
      ...(body.seatLimit     !== undefined && { seatLimit:     Number(body.seatLimit) }),
      ...(body.name          !== undefined && { name:          String(body.name) }),
    },
  });

  return NextResponse.json({ success: true, package: pkg });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.package.delete({ where: { id } });
  return NextResponse.json({ success: true });
}