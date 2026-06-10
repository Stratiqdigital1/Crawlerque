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

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(body.auditsUsed  !== undefined && { auditsUsed:  Number(body.auditsUsed) }),
      ...(body.status      !== undefined && { status:      String(body.status) }),
      ...(body.role        !== undefined && { role:        String(body.role) }),
      ...(body.packageId   !== undefined && { packageId:   String(body.packageId) }),
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      auditsUsed: true,
    },
  });

  return NextResponse.json({ success: true, user: updated });
}