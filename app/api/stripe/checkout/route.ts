import { NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { priceId, packageName } = body;

    if (!priceId) {
      return NextResponse.json({ error: "Price ID required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("stratiq_session")?.value;
    const session: any = token ? await verifySessionToken(token) : null;

    const origin = new URL(req.url).origin;

const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/signup?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(packageName)}`,
      cancel_url: `${origin}/#pricing`,
      metadata: { packageName },
      subscription_data: {
        metadata: { packageName },
        // trial_period_days: 7,
      },
      // payment_method_collection: "always",
      billing_address_collection: "auto",
    };

    if (session?.userId) {
      const user = await prisma.user.findUnique({ where: { id: session.userId } });

      if (user) {
        let customerId = user.stripeCustomerId;

        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name || user.email,
            metadata: { userId: user.id },
          });
          customerId = customer.id;
          await prisma.user.update({
            where: { id: user.id },
            data: { stripeCustomerId: customerId },
          });
        }

        checkoutParams.customer = customerId;
        checkoutParams.metadata!.userId = user.id;
        checkoutParams.subscription_data!.metadata!.userId = user.id;
        checkoutParams.success_url = `${origin}/dashboard?upgraded=true&session_id={CHECKOUT_SESSION_ID}`;
        checkoutParams.cancel_url = `${origin}/dashboard?tab=billing&cancelled=true`;
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({
      error: "Failed to create checkout session",
      detail: error?.message || String(error),
    }, { status: 500 });
  }
}