import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const protectedRoutes = ["/dashboard", "/admin"];

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");

async function verifyToken(token: string) {
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET");
  }

  const { payload } = await jwtVerify(token, secret);
  return payload as {
    userId?: string;
    email?: string;
    role?: string;
  };
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("stratiq_session")?.value;
  const path = req.nextUrl.pathname;

  const isProtected = protectedRoutes.some((route) =>
    path.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const payload = await verifyToken(token);

    if (path.startsWith("/admin") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};