import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Call this via Vercel Cron or an external scheduler daily at midnight.
// Add to vercel.json: { "crons": [{ "path": "/api/cron/reset-audits", "schedule": "0 0 * * *" }] }

export async function GET(req: Request) {
  // Protect with a shared secret so only your cron caller can trigger it
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Reset users whose auditsResetAt is older than 30 days
    // and who have an active subscription
    const result = await prisma.user.updateMany({
      where: {
        auditsResetAt: { lt: thirtyDaysAgo },
        stripeStatus: { in: ["active", "trialing"] },
        role: { not: "admin" },
      },
      data: {
        auditsUsed: 0,
        auditsResetAt: now,
      },
    });

    console.log(`Reset audits for ${result.count} users`);

    return NextResponse.json({
      success: true,
      usersReset: result.count,
      resetAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Audit reset cron failed:", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}