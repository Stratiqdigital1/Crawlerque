import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security-headers";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

async function getAdminFromCookie() {
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
  try {
    const admin = await getAdminFromCookie();

    if (!admin) {
      return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Admin access required" },
    { status: 403 }
  )
);
    }
    const totalUsers = await prisma.user.count();

    const totalReports =
      await prisma.auditReport.count();

    const admins = await prisma.user.count({
      where: {
        role: "admin",
      },
    });

    const packages =
      await prisma.package.count();

    const reports = await prisma.auditReport.findMany({
  include: {
    user: true,
  },
  orderBy: {
    createdAt: "desc",
  },
  take: 20,
});

const auditLogs = await prisma.auditLog.findMany({
  orderBy: {
    createdAt: "desc",
  },
  take: 50,
});

const packageRows = await prisma.package.findMany({
  orderBy: {
    priceMonthly: "asc",
  },
});

const users = await prisma.user.findMany({
      include: {
        package: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return withSecurityHeaders(
  NextResponse.json({
    success: true,
      totalUsers,
      totalReports,
      admins,
      packages,
      users,
      reports,
      packageRows,
      auditLogs,
    })
);
  } catch (error) {
    return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Failed to load admin stats" },
    { status: 500 }
  )
);
  }
}