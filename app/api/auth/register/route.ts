import { NextResponse } from "next/server";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const { email, name, password, sessionId, plan } = await req.json();

    if (!email || !password || !sessionId) {
      return NextResponse.json(
        { error: "Email, password, and payment session are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Verify Stripe session server-side — never trust only the client
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not confirmed. Please contact support." },
        { status: 402 }
      );
    }

    const subscription = stripeSession.subscription as Stripe.Subscription;
    const packageName  = stripeSession.metadata?.packageName || plan || "Starter";
    const customerId   = typeof stripeSession.customer === "string"
      ? stripeSession.customer
      : stripeSession.customer?.id || null;

    // Check if a user already exists with this email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }

    // Find the matching package
    const pkg = await prisma.package.findFirst({
      where: { name: packageName },
    });

    if (!pkg) {
      return NextResponse.json(
        { error: `Package "${packageName}" not found. Please contact support.` },
        { status: 500 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name:             name || email,
        passwordHash,
        role:             "user",
        status:           "active",
        packageId:        pkg.id,
        packageName:      pkg.name,
        monthlyAudits:    pkg.monthlyAudits,
        allowPdf:         pkg.allowPdf,
        allowAi:          pkg.allowAi,
        allowTraffic:     pkg.allowTraffic,
        allowKeywords:    pkg.allowKeywords,
        allowBacklinks:   pkg.allowBacklinks,
        allowLocalSeo:    pkg.allowLocalSeo,
        allowWhiteLabel:  pkg.allowWhiteLabel,
        stripeCustomerId:      customerId,
        stripeSubscriptionId:  subscription?.id || null,
        stripePriceId:         subscription?.items?.data[0]?.price?.id || null,
        stripeStatus:          subscription?.status || "active",
        stripeCurrentPeriodEnd: subscription?.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        auditsUsed:   0,
        auditsResetAt: new Date(),
      },
    });

    // Create session token and set cookie so they land directly in dashboard
    const token = await createSessionToken({
      userId: user.id,
      email:  user.email,
      role:   user.role,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("stratiq_session", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 7, // 7 days
      path:     "/",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}