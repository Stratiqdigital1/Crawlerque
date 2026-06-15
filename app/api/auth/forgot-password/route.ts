import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success, even if the user doesn't exist —
    // prevents leaking which emails are registered.
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Generate a secure random token, valid for 1 hour
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        used: false,
      },
    });

    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (mailError) {
      console.error("Failed to send password reset email:", mailError);
      // Don't expose mail failures to the client — token still exists,
      // user can be helped manually if needed.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}