import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ paid: false, error: "No session ID" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    const paid = session.payment_status === "paid";
    const customer = session.customer as Stripe.Customer | null;
    const email = customer?.email || session.customer_details?.email || "";
    const name = customer?.name || session.customer_details?.name || "";

    return NextResponse.json({ paid, email, name, sessionId });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({ paid: false, error: "Verification failed" }, { status: 500 });
  }

  
}