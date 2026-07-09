import { Resend } from "resend";
import { BRAND } from "@/lib/constants";

type OrderEmailItem = {
  name: string;
  priceCents: number;
  image: string;
};

type OrderEmailPayload = {
  orderId: string;
  customerEmail: string;
  customerName?: string | null;
  shippingAddress: Record<string, string> | null;
  totalCents: number;
  items: OrderEmailItem[];
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatAddress(address: Record<string, string> | null) {
  if (!address) return "Not provided";
  const lines = [
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean);
  return lines.join("<br/>");
}

export async function sendOrderConfirmationEmail(payload: OrderEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Ksara Decor <orders@ksaradecor.com>";

  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping confirmation email");
    return { skipped: true as const };
  }

  const resend = new Resend(apiKey);
  const itemRows = payload.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f2d4cc;">
          <img src="${item.image}" alt="${item.name}" width="72" height="72" style="border-radius:8px;object-fit:cover;" />
        </td>
        <td style="padding:12px 0 12px 12px;border-bottom:1px solid #f2d4cc;">
          <strong>${item.name}</strong><br/>
          <span style="color:#666;">One-of-a-kind hand-painted bottle</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f2d4cc;text-align:right;">${formatMoney(item.priceCents)}</td>
      </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Poppins,Arial,sans-serif;background:#f2d4cc;padding:24px;color:#2d2d2d;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;">
        <h1 style="margin:0 0 8px;color:#1a2b56;">Thank you from ${BRAND.name}</h1>
        <p style="margin:0 0 16px;">${BRAND.tagline}</p>
        <p>Order <strong>#${payload.orderId.slice(-8).toUpperCase()}</strong> is confirmed. Each piece is hand-painted and one-of-a-kind — yours is being prepared with care.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">${itemRows}</table>
        <p><strong>Total:</strong> ${formatMoney(payload.totalCents)}</p>
        <p><strong>Ship to:</strong><br/>${formatAddress(payload.shippingAddress)}</p>
        <p style="font-size:14px;color:#666;">Estimated delivery: 7–14 business days after dispatch. We'll email you when your bottle ships.</p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from,
    to: payload.customerEmail,
    subject: `Your ${BRAND.name} order is confirmed`,
    html,
  });

  return { sent: true as const };
}
