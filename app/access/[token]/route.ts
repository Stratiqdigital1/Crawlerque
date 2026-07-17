import { NextResponse } from "next/server";
import {
  PromoAccessStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
} from "@/lib/auth";
import {
  hashPromoToken,
  isPromoAccessExpired,
} from "@/lib/promo-access";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function redirectWithError(
  request: Request,
  code: string
) {
  const url = new URL("/login", request.url);
  url.searchParams.set("promo", code);

  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { token: encodedToken } =
      await context.params;

    const token = decodeURIComponent(
      encodedToken || ""
    ).trim();

    if (!token) {
      return redirectWithError(
        request,
        "invalid"
      );
    }

    const access =
      await prisma.promoAccess.findUnique({
        where: {
          tokenHash:
            hashPromoToken(token),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      });

    if (
      !access ||
      access.status !==
        PromoAccessStatus.ACTIVE ||
      isPromoAccessExpired(
        access.expiresAt
      ) ||
      access.user.status === "suspended"
    ) {
      return redirectWithError(
        request,
        "unavailable"
      );
    }

    const sessionToken =
      await createSessionToken({
        id: access.user.id,
        email: access.user.email,
        role: access.user.role,
        promoAccessId: access.id,
      });

    const dashboardUrl = new URL(
      "/dashboard",
      request.url
    );

    dashboardUrl.searchParams.set(
      "promo",
      "1"
    );

    const response =
      NextResponse.redirect(
        dashboardUrl
      );

    response.cookies.set(
      "stratiq_session",
      sessionToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    response.headers.set(
      "Cache-Control",
      "no-store"
    );

    return response;
  } catch (error) {
    console.error(
      "Promotional access failed:",
      error
    );

    return redirectWithError(
      request,
      "invalid"
    );
  }
}
