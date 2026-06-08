import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = String(body?.token || "");
    const password = String(body?.password || "");

    if (!token || !password || password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Token and password with at least 8 characters are required",
        },
        { status: 400 }
      );
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.used ||
      resetToken.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        password: await hashPassword(password),
        mustChangePassword: false,
      },
    });

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Password reset failed" },
      { status: 500 }
    );
  }
}