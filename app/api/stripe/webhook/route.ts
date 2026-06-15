import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
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
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const packageName = session.metadata?.packageName;
        if (!packageName) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const pkg = await prisma.package.findFirst({ where: { name: packageName } });
        if (!pkg) break;

if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              packageId:             pkg.id,
              packageName:           pkg.name,
              stripeSubscriptionId:  subscription.id,
              stripePriceId:         subscription.items.data[0]?.price.id,
              stripeStatus:          subscription.status,
              stripeCurrentPeriodEnd:    new Date((subscription as any).current_period_end * 1000),
              stripeCancelAtPeriodEnd:   (subscription as any).cancel_at_period_end,
              monthlyAudits:  pkg.monthlyAudits,
              allowPdf:       pkg.allowPdf,
              allowAi:        pkg.allowAi,
              allowTraffic:   pkg.allowTraffic,
              allowKeywords:  pkg.allowKeywords,
              allowBacklinks: pkg.allowBacklinks,
              allowLocalSeo:  pkg.allowLocalSeo,
              allowWhiteLabel: pkg.allowWhiteLabel,
              auditsUsed:    0,
              trialAuditsUsed: 0,
              auditsResetAt: new Date(),
            },
          });
        }
        break;
      }

case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const newPriceId = sub.items.data[0]?.price.id;
        const cancelAtPeriodEnd = (sub as any).cancel_at_period_end;

        // Map the new price back to a Package row, regardless of whether
        // it's the monthly or annual price for that plan.
        const pkg = newPriceId
          ? await prisma.package.findFirst({
              where: {
                OR: [
                  { stripePriceId: newPriceId },
                  { stripePriceIdAnnual: newPriceId },
                ],
              },
            })
          : null;

        // Find the current user to check what plan they're on right now.
        const existingUser = await prisma.user.findFirst({
          where: { stripeSubscriptionId: sub.id },
          select: { packageName: true, stripeStatus: true },
        });

        const wasTrialing = existingUser?.packageName === "Trial";
        const stillTrialing = sub.status === "trialing";

        // Trial ended (status moved off "trialing") and the subscription
        // wasn't converted to a different paid plan (still pointing at the
        // Trial price) — OR the trial was cancelled before it ended.
        // Either way: end access immediately, no charge.
        const trialEndedWithoutUpgrade =
          wasTrialing && !stillTrialing && (pkg?.name === "Trial" || cancelAtPeriodEnd);

        if (trialEndedWithoutUpgrade) {
          // Cancel the subscription outright (in case Stripe left it active
          // on the $0/low Trial price) and lock the account down.
          try {
            await stripe.subscriptions.cancel(sub.id);
          } catch (e) {
            console.error("Failed to cancel expired trial subscription:", e);
          }

          await prisma.user.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: {
              stripeStatus:    "canceled",
              packageName:     "Trial",
              monthlyAudits:   0,
              trialAuditsUsed: 3,
              allowPdf:        false,
              allowAi:         false,
              allowTraffic:    false,
              allowKeywords:   false,
              allowBacklinks:  false,
              allowLocalSeo:   false,
              allowWhiteLabel: false,
            },
          });
          break;
        }

        await prisma.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            stripeStatus:              sub.status,
            stripePriceId:             newPriceId,
            stripeCurrentPeriodEnd:    new Date((sub as any).current_period_end * 1000),
            stripeCancelAtPeriodEnd:   cancelAtPeriodEnd,
            ...(pkg && pkg.name !== "Trial" && {
              packageId:       pkg.id,
              packageName:     pkg.name,
              monthlyAudits:   pkg.monthlyAudits,
              allowPdf:        pkg.allowPdf,
              allowAi:         pkg.allowAi,
              allowTraffic:    pkg.allowTraffic,
              allowKeywords:   pkg.allowKeywords,
              allowBacklinks:  pkg.allowBacklinks,
              allowLocalSeo:   pkg.allowLocalSeo,
              allowWhiteLabel: pkg.allowWhiteLabel,
              trialAuditsUsed: 0,
              auditsUsed:      0,
              auditsResetAt:   new Date(),
            }),
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
            stripeStatus:   "canceled",
            packageId:      freePkg?.id || null,
            packageName:    "Free",
            monthlyAudits:  3,
            allowPdf:       false,
            allowAi:        false,
            allowTraffic:   false,
            allowKeywords:  false,
            allowBacklinks: false,
            allowLocalSeo:  false,
            allowWhiteLabel: false,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny = invoice as any;
        const subId = invoiceAny.subscription || invoiceAny.subscriptionDetails?.subscription;
        if (subId) {
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: String(subId) },
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