import { NextResponse } from "next/server";
import Stripe from "stripe";
import { clearCart } from "@/lib/cart";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { getPrisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const fullSession = await stripe.checkout.sessions.retrieve(session.id);

    try {
      const order = await getPrisma().order.findUnique({
        where: { stripeSessionId: session.id },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        console.error("Order not found for session", session.id);
        return NextResponse.json({ received: true });
      }

      if (order.status === "paid") {
        return NextResponse.json({ received: true });
      }

      const productIds = order.items.map((item) => item.productId);

      await getPrisma().$transaction(async (tx) => {
        const soldUpdate = await tx.product.updateMany({
          where: { id: { in: productIds }, isSold: false },
          data: { isSold: true },
        });

        if (soldUpdate.count !== productIds.length) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: "cancelled" },
          });
          throw new Error("One or more products already sold");
        }

        const address =
          fullSession.customer_details?.address ??
          (fullSession as Stripe.Checkout.Session & {
            shipping_details?: { address?: Stripe.Address | null } | null;
          }).shipping_details?.address;

        const shipping = address
          ? {
              line1: address.line1 ?? "",
              line2: address.line2 ?? "",
              city: address.city ?? "",
              state: address.state ?? "",
              postal_code: address.postal_code ?? "",
              country: address.country ?? "",
            }
          : undefined;

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "paid",
            customerEmail: fullSession.customer_details?.email ?? order.customerEmail,
            customerName: fullSession.customer_details?.name ?? null,
            shippingAddress: shipping,
            totalCents: fullSession.amount_total ?? order.totalCents,
          },
        });
      });

      const paidOrder = await getPrisma().order.findUnique({
        where: { id: order.id },
        include: { items: { include: { product: true } } },
      });

      if (paidOrder?.status === "paid") {
        const cartId = fullSession.metadata?.cartId;
        if (cartId) await clearCart(cartId);

        await sendOrderConfirmationEmail({
          orderId: paidOrder.id,
          customerEmail: paidOrder.customerEmail,
          customerName: paidOrder.customerName,
          shippingAddress: paidOrder.shippingAddress as Record<string, string> | null,
          totalCents: paidOrder.totalCents,
          items: paidOrder.items.map((item) => ({
            name: item.product.name,
            priceCents: item.priceAtPurchase,
            image: item.product.images[0] ?? "/images/placeholder-collection.svg",
          })),
        });
      }
    } catch (error) {
      console.error("Webhook processing failed:", error);
      return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
