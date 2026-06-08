import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security-headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
    });

    if (!user) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Invalid email or password." },
          { status: 401 }
        )
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Invalid email or password." },
          { status: 401 }
        )
      );
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Cookie must be set directly on the NextResponse object in App Router.
    // Setting it via cookieStore after the response is built does NOT work —
    // the Set-Cookie header never reaches the browser.
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set("stratiq_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return withSecurityHeaders(response);
  } catch (error) {
    console.error("Login error:", error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: "Login failed." },
        { status: 500 }
      )
    );
  }
}