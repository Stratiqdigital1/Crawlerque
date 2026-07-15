import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionEmail } from "@/lib/mail";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

const CRAWLER_QUE_APP = "crawlerque";

function getStripeObjectId(value: any): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (typeof value?.id === "string") {
    return value.id;
  }

  return null;
}

function getInvoiceSubscriptionData(
  invoice: Stripe.Invoice
) {
  const invoiceAny = invoice as any;

  const subscriptionDetails =
    invoiceAny.parent?.subscription_details ||
    invoiceAny.subscription_details ||
    invoiceAny.subscriptionDetails ||
    null;

  const subscriptionId = getStripeObjectId(
    subscriptionDetails?.subscription ||
      invoiceAny.subscription
  );

  const metadata =
    subscriptionDetails?.metadata || {};

  return {
    subscriptionId,
    metadata,
  };
}

function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription
): Date | null {
  const subscriptionAny = subscription as any;
  const firstItem = subscription.items.data[0] as any;

  const periodEnd =
    firstItem?.current_period_end ||
    subscriptionAny.current_period_end;

  if (!periodEnd) return null;

  return new Date(Number(periodEnd) * 1000);
}

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
  const session =
    event.data.object as Stripe.Checkout.Session;

  const app = session.metadata?.app;
  const userId = session.metadata?.userId;
  const packageName =
    session.metadata?.packageName;

  // Ignore every checkout that did not originate
  // from Crawler Que.
  if (
    app !== CRAWLER_QUE_APP ||
    !packageName ||
    !session.subscription
  ) {
    break;
  }

  const subscriptionId = getStripeObjectId(
    session.subscription
  );

  if (!subscriptionId) {
    break;
  }

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  const pkg = await prisma.package.findFirst({
    where: {
      name: packageName,
    },
  });

  if (!pkg) {
    console.error(
      "Crawler Que package not found:",
      packageName
    );
    break;
  }

  const existingUser = userId
    ? await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
    : null;

  if (userId) {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        packageId: pkg.id,
        packageName: pkg.name,
        stripeSubscriptionId:
          subscription.id,
        stripePriceId:
          subscription.items.data[0]?.price.id,
        stripeStatus:
          subscription.status,
        stripeCurrentPeriodEnd:
          getSubscriptionPeriodEnd(
            subscription
          ),
        stripeCancelAtPeriodEnd:
          (subscription as any)
            .cancel_at_period_end,
        monthlyAudits:
          pkg.monthlyAudits,
        allowPdf:
          pkg.allowPdf,
        allowAi:
          pkg.allowAi,
        allowTraffic:
          pkg.allowTraffic,
        allowKeywords:
          pkg.allowKeywords,
        allowBacklinks:
          pkg.allowBacklinks,
        allowLocalSeo:
          pkg.allowLocalSeo,
        allowWhiteLabel:
          pkg.allowWhiteLabel,
        auditsUsed: 0,
        trialAuditsUsed: 0,
        auditsResetAt: new Date(),
      },
    });
  }

  // Trial does not have a paid invoice yet,
  // therefore send its welcome email here.
  if (
    packageName === "Trial" &&
    subscription.metadata
      ?.cqTrialWelcomeSent !== "true"
  ) {
    let recipientEmail =
      existingUser?.email ||
      session.customer_details?.email ||
      null;

    const customerId = getStripeObjectId(
      session.customer
    );

    if (!recipientEmail && customerId) {
      const customer =
        await stripe.customers.retrieve(
          customerId
        );

      if (!customer.deleted) {
        recipientEmail = customer.email;
      }
    }

    if (recipientEmail) {
      const appUrl = (
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://crawlerque.com"
      ).replace(/\/$/, "");

      const dashboardUrl = userId
        ? `${appUrl}/dashboard`
        : `${appUrl}/signup?session_id=${encodeURIComponent(
            session.id
          )}&plan=${encodeURIComponent(
            packageName
          )}`;

      await sendSubscriptionEmail({
        kind: "trial",
        to: recipientEmail,
        name: existingUser?.name,
        planName: pkg.name,
        monthlyAudits:
          pkg.monthlyAudits,
        dashboardUrl,
        billingInterval:
          subscription.items.data[0]?.price
            .recurring?.interval,
        nextBillingDate:
          getSubscriptionPeriodEnd(
            subscription
          ),
      });

      await stripe.subscriptions.update(
        subscription.id,
        {
          metadata: {
            ...subscription.metadata,
            cqTrialWelcomeSent: "true",
          },
        }
      );
    } else {
      console.error(
        "Trial welcome email skipped: no customer email",
        {
          sessionId: session.id,
        }
      );
    }
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

case "invoice.paid": {
  const invoice =
    event.data.object as Stripe.Invoice;

  // Stripe may retry the webhook.
  // Do not send the same invoice email twice.
  if (
    invoice.metadata
      ?.cqCustomerEmailSent === "true"
  ) {
    break;
  }

  const {
    subscriptionId,
    metadata: invoiceSubscriptionMetadata,
  } = getInvoiceSubscriptionData(invoice);

  if (!subscriptionId) {
    break;
  }

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  const sourceMetadata = {
    ...subscription.metadata,
    ...invoiceSubscriptionMetadata,
  };

  // This is the main protection for the shared
  // Stripe account. Ignore other businesses.
  if (
    sourceMetadata.app !==
    CRAWLER_QUE_APP
  ) {
    break;
  }

  const currentPrice =
    subscription.items.data[0]?.price;

  const priceId = currentPrice?.id;

  if (!priceId) {
    console.error(
      "Paid invoice has no subscription price:",
      invoice.id
    );
    break;
  }

  // Match only prices stored in the Crawler Que
  // Package table.
  const pkg =
    await prisma.package.findFirst({
      where: {
        OR: [
          {
            stripePriceId: priceId,
          },
          {
            stripePriceIdAnnual:
              priceId,
          },
        ],
      },
    });

  // Free and Trial do not receive paid invoice emails.
  if (
    !pkg ||
    pkg.name === "Free" ||
    pkg.name === "Trial"
  ) {
    break;
  }

  const userId =
    sourceMetadata.userId || null;

  const customerId = getStripeObjectId(
    invoice.customer
  );

  let user = userId
    ? await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
    : null;

  if (!user) {
    user =
      await prisma.user.findFirst({
        where: {
          stripeSubscriptionId:
            subscription.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
  }

  if (!user && customerId) {
    user =
      await prisma.user.findFirst({
        where: {
          stripeCustomerId:
            customerId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
  }

  let recipientEmail =
    user?.email ||
    (invoice as any).customer_email ||
    null;

  if (!recipientEmail && customerId) {
    const customer =
      await stripe.customers.retrieve(
        customerId
      );

    if (!customer.deleted) {
      recipientEmail = customer.email;
    }
  }

  if (!recipientEmail) {
    console.error(
      "Crawler Que invoice email skipped: no customer email",
      {
        invoiceId: invoice.id,
        subscriptionId:
          subscription.id,
      }
    );
    break;
  }

  const paidWelcomeAlreadySent =
    subscription.metadata
      ?.cqPaidWelcomeSent === "true";

  const billingReason =
    invoice.billing_reason;

  const emailKind =
    !paidWelcomeAlreadySent
      ? "purchase"
      : billingReason ===
          "subscription_cycle"
        ? "renewal"
        : "payment";

  const appUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://crawlerque.com"
  ).replace(/\/$/, "");

  const dashboardUrl = user
    ? `${appUrl}/dashboard`
    : `${appUrl}/signup`;

  await sendSubscriptionEmail({
    kind: emailKind,
    to: recipientEmail,
    name: user?.name,
    planName: pkg.name,
    monthlyAudits:
      pkg.monthlyAudits,
    dashboardUrl,
    amountPaid:
      invoice.amount_paid,
    currency:
      invoice.currency,
    billingInterval:
      currentPrice?.recurring?.interval,
    invoiceNumber:
      invoice.number,
    nextBillingDate:
      getSubscriptionPeriodEnd(
        subscription
      ),
    hostedInvoiceUrl:
      invoice.hosted_invoice_url,
    invoicePdfUrl:
      invoice.invoice_pdf,
  });

  // Mark this invoice after the email has been sent.
  // Stripe can retry webhook deliveries.
  await stripe.invoices.update(
    invoice.id,
    {
      metadata: {
        ...(invoice.metadata || {}),
        cqCustomerEmailSent:
          "true",
        cqCustomerEmailType:
          emailKind,
      },
    }
  );

  // First successful paid invoice becomes the
  // welcome email. Future paid invoices become
  // renewal/payment emails.
  if (!paidWelcomeAlreadySent) {
    await stripe.subscriptions.update(
      subscription.id,
      {
        metadata: {
          ...subscription.metadata,
          cqPaidWelcomeSent: "true",
        },
      }
    );
  }

  break;
}

case "invoice.payment_failed": {
  const invoice =
    event.data.object as Stripe.Invoice;

  const {
    subscriptionId: subId,
  } = getInvoiceSubscriptionData(invoice);

  if (subId) {
    await prisma.user.updateMany({
      where: {
        stripeSubscriptionId: String(subId),
      },
      data: {
        stripeStatus: "past_due",
      },
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