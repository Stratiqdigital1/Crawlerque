import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendTrialExpiryReminderEmail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!,
  {
    apiVersion: "2026-05-27.dahlia",
  }
);

const CRAWLER_QUE_APP = "crawlerque";

// The hourly job sends the reminder when approximately
// 20–28 hours remain in the trial.
const MIN_SECONDS_LEFT = 20 * 60 * 60;
const MAX_SECONDS_LEFT = 28 * 60 * 60;

function getStripeId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer
) {
  if (typeof value === "string") {
    return value;
  }

  return value?.id || null;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization =
    req.headers.get("authorization");

  if (
    !cronSecret ||
    authorization !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const nowInSeconds =
    Math.floor(Date.now() / 1000);

  let checked = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Auto-pagination checks every trialing subscription,
    // not only the first 100.
    for await (
      const subscription of stripe.subscriptions.list({
        status: "trialing",
        limit: 100,
      })
    ) {
      checked += 1;

      try {
        // Shared Stripe account protection:
        // ignore subscriptions belonging to another business.
        if (
          subscription.metadata?.app !==
          CRAWLER_QUE_APP
        ) {
          skipped += 1;
          continue;
        }

        if (!subscription.trial_end) {
          skipped += 1;
          continue;
        }

        // Prevent duplicate reminder emails.
        if (
          subscription.metadata
            ?.cqTrialExpiryReminderSent === "true"
        ) {
          skipped += 1;
          continue;
        }

        const secondsLeft =
          subscription.trial_end -
          nowInSeconds;

        if (
          secondsLeft < MIN_SECONDS_LEFT ||
          secondsLeft > MAX_SECONDS_LEFT
        ) {
          skipped += 1;
          continue;
        }

        const metadataUserId =
          subscription.metadata?.userId?.trim();

        let user: {
          name: string | null;
          email: string;
        } | null = null;

        if (metadataUserId) {
          user =
            await prisma.user.findUnique({
              where: {
                id: metadataUserId,
              },
              select: {
                name: true,
                email: true,
              },
            });
        }

        if (!user) {
          user =
            await prisma.user.findFirst({
              where: {
                stripeSubscriptionId:
                  subscription.id,
              },
              select: {
                name: true,
                email: true,
              },
            });
        }

        let recipientEmail =
          user?.email || null;

        let recipientName =
          user?.name || null;

        const customerId = getStripeId(
          subscription.customer
        );

        if (
          (!recipientEmail || !recipientName) &&
          customerId
        ) {
          const customer =
            await stripe.customers.retrieve(
              customerId
            );

          if (!customer.deleted) {
            recipientEmail =
              recipientEmail ||
              customer.email ||
              null;

            recipientName =
              recipientName ||
              customer.name ||
              null;
          }
        }

        if (!recipientEmail) {
          failed += 1;

          console.error(
            "Trial reminder skipped: no email found",
            {
              subscriptionId:
                subscription.id,
            }
          );

          continue;
        }

        const appUrl = (
          process.env.APP_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "https://crawlerque.com"
        ).replace(/\/$/, "");

        await sendTrialExpiryReminderEmail({
          to: recipientEmail,
          name: recipientName,
          trialEndsAt: new Date(
            subscription.trial_end * 1000
          ),
          upgradeUrl:
            `${appUrl}/dashboard?tab=billing`,
        });

        // Save marker only after the email has
        // successfully been accepted by SMTP.
        await stripe.subscriptions.update(
          subscription.id,
          {
            metadata: {
              ...subscription.metadata,
              cqTrialExpiryReminderSent:
                "true",
              cqTrialExpiryReminderSentAt:
                new Date().toISOString(),
            },
          }
        );

        sent += 1;

        console.log(
          "Trial expiry reminder sent:",
          {
            subscriptionId:
              subscription.id,
            email: recipientEmail,
            trialEnd:
              subscription.trial_end,
          }
        );
      } catch (subscriptionError) {
        failed += 1;

        console.error(
          "Trial reminder processing failed:",
          {
            subscriptionId:
              subscription.id,
            error: subscriptionError,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      sent,
      skipped,
      failed,
    });
  } catch (error) {
    console.error(
      "Trial reminder cron failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Trial reminder cron failed",
      },
      {
        status: 500,
      }
    );
  }
}