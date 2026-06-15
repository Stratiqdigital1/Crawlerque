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
    const cookieStore = await cookies();
    const token = cookieStore.get("stratiq_session")?.value;
    const session: any = token ? await verifySessionToken(token) : null;

    if (!session?.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { priceId } = await req.json();
    if (!priceId) {
      return NextResponse.json({ error: "Price ID required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user?.stripeSubscriptionId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }

    // Fetch the current subscription to find the existing item to swap
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const currentItem = subscription.items.data[0];

    if (!currentItem) {
      return NextResponse.json({ error: "Subscription has no items" }, { status: 400 });
    }

    // Update the subscription: swap the price, prorate the difference.
    // If they're still in their trial, Stripe preserves the trial end date.
    const updated = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [{ id: currentItem.id, price: priceId }],
      proration_behavior: "create_prorations",
    });

    return NextResponse.json({
      success: true,
      status: updated.status,
    });
  } catch (error: any) {
    console.error("Plan change error:", error);
    return NextResponse.json({
      error: "Failed to change plan",
      detail: error?.message || String(error),
    }, { status: 500 });
  }
}