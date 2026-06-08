import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.CheckoutSession;
        const userId = session.metadata?.userId;
        const packageName = session.metadata?.packageName;
        if (!packageName) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const pkg = await prisma.package.findFirst({ where: { name: packageName } });
        if (!pkg) break;

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              packageId: pkg.id,
              packageName: pkg.name,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id,
              stripeStatus: subscription.status,
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
              stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
              monthlyAudits: pkg.monthlyAudits,
              allowPdf: pkg.allowPdf,
              allowAi: pkg.allowAi,
              allowTraffic: pkg.allowTraffic,
              allowKeywords: pkg.allowKeywords,
              allowBacklinks: pkg.allowBacklinks,
              allowLocalSeo: pkg.allowLocalSeo,
              allowWhiteLabel: pkg.allowWhiteLabel,
              auditsUsed: 0,
              auditsResetAt: new Date(),
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            stripeStatus: sub.status,
            stripeCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
            stripeCancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const freePkg = await prisma.package.findFirst({ where: { name: "Free" } });
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            stripeStatus: "canceled",
            packageId: freePkg?.id || null,
            packageName: "Free",
            monthlyAudits: 3,
            allowPdf: false,
            allowAi: false,
            allowTraffic: false,
            allowKeywords: false,
            allowBacklinks: false,
            allowLocalSeo: false,
            allowWhiteLabel: false,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: String(invoice.subscription) },
            data: { stripeStatus: "past_due" },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}