import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withSecurityHeaders } from "@/lib/security-headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

    cookieStore.set("stratiq_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
      })
    );
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error: "Logout failed.",
        },
        {
          status: 500,
        }
      )
    );
  }
}