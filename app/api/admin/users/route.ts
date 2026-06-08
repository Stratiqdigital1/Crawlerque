import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { generateRandomPassword, hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/mail";

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
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const users = await prisma.user.findMany({
    include: { package: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, users });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();

  const email = String(body.email || "").toLowerCase().trim();
  const name = String(body.name || "").trim();
  const packageId = body.packageId || null;
  const role = body.role || "user";

  if (!email) {
    return NextResponse.json(
      { success: false, error: "Email is required" },
      { status: 400 }
    );
  }

  const randomPassword = generateRandomPassword();
  const hashedPassword = await hashPassword(randomPassword);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashedPassword,
      role,
      packageId,
      mustChangePassword: true,
      status: "active",
    },
    include: { package: true },
  });

  const resetToken = crypto.randomBytes(32).toString("hex");

  await prisma.passwordResetToken.create({
    data: {
      token: resetToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: email,
    subject: "Your Strat IQ Website Audit Tool Access",
    html: `
      <h2>Your account has been created</h2>
      <p>Hello ${name || "there"},</p>
      <p>You now have access to the Strat IQ Website Audit Tool.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> ${randomPassword}</p>
      <p>Please reset your password using the link below:</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This reset link expires in 24 hours.</p>
    `,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      package: user.package,
      auditsUsed: user.auditsUsed,
      mustChangePassword: user.mustChangePassword,
    },
  });
}