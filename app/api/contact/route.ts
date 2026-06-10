import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email and message are required." },
        { status: 400 }
      );
    }

    await sendEmail({
      to: "info@crawlerque.com",
      subject: `Contact Form: ${subject || "New message"} — from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff">
          <h2 style="color:#C5FF3D;margin-bottom:8px">New Contact Form Submission</h2>
          <p style="color:#888;margin-bottom:24px">Submitted via crawlerque.com/contact</p>

          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#888;width:120px">Name</td><td style="padding:8px 0;color:#fff">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0;color:#C5FF3D">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Subject</td><td style="padding:8px 0;color:#fff">${subject || "Not specified"}</td></tr>
          </table>

          <div style="margin-top:24px;padding:16px;background:#111;border-radius:8px;border-left:3px solid #C5FF3D">
            <p style="color:#888;font-size:12px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em">Message</p>
            <p style="color:#ccc;line-height:1.7">${message.replace(/\n/g, "<br>")}</p>
          </div>

          <p style="margin-top:24px;color:#555;font-size:12px">
            Reply directly to this email to respond to ${name} at ${email}
          </p>
        </div>
      `,
    });

    // Also send a confirmation to the user
    await sendEmail({
      to: email,
      subject: "We received your message — Crawler Que",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff">
          <h2 style="color:#C5FF3D">Thanks, ${name}!</h2>
          <p style="color:#888;line-height:1.7">
            We received your message and will get back to you within 2 business days.
          </p>
          <p style="color:#888;line-height:1.7;margin-top:16px">
            If your question is about billing, you can also manage your subscription directly from your
            <a href="https://crawlerque.com/dashboard" style="color:#C5FF3D">dashboard</a>.
          </p>
          <p style="margin-top:24px;color:#555;font-size:12px">
            Crawler Que by Strat IQ Digital &nbsp;·&nbsp; info@crawlerque.com
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please email us directly at info@crawlerque.com" },
      { status: 500 }
    );
  }
}