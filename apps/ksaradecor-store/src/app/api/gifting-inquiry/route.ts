import { NextResponse } from "next/server";
import { Resend } from "resend";
import { BRAND } from "@/lib/constants";

type GiftingInquiryPayload = {
  name: string;
  email: string;
  company?: string;
  occasion?: string;
  quantity?: string;
  message: string;
};

function isValidPayload(body: unknown): body is GiftingInquiryPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === "string" &&
    b.name.trim().length > 0 &&
    typeof b.email === "string" &&
    b.email.includes("@") &&
    typeof b.message === "string" &&
    b.message.trim().length > 0
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Please fill in your name, email, and a short message." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.GIFTING_NOTIFY_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL ?? `${BRAND.name} <orders@ksaradecor.com>`;

  if (!apiKey || !notifyTo) {
    console.warn("Gifting inquiry received (email not configured — logging only):", body);
    return NextResponse.json({ received: true, emailed: false });
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: notifyTo,
    replyTo: body.email,
    subject: `Corporate/event gifting inquiry — ${body.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#2d2d2d;">
        <h2 style="color:#1a2b56;">New gifting inquiry</h2>
        <p><strong>Name:</strong> ${body.name}</p>
        <p><strong>Email:</strong> ${body.email}</p>
        ${body.company ? `<p><strong>Company:</strong> ${body.company}</p>` : ""}
        ${body.occasion ? `<p><strong>Occasion:</strong> ${body.occasion}</p>` : ""}
        ${body.quantity ? `<p><strong>Quantity:</strong> ${body.quantity}</p>` : ""}
        <p><strong>Message:</strong><br/>${body.message.replace(/\n/g, "<br/>")}</p>
      </div>
    `,
  });

  return NextResponse.json({ received: true, emailed: true });
}
