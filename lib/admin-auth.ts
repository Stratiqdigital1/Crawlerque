import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export async function getAdminUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("stratiq_session")?.value;

    if (!token) {
      return null;
    }

    const payload: any = await verifySessionToken(token);

    if (!payload?.userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: String(payload.userId),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return null;
    }

    if (user.role !== "admin") {
      return null;
    }

    if (user.status === "suspended") {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Admin authentication failed:", error);
    return null;
  }
}