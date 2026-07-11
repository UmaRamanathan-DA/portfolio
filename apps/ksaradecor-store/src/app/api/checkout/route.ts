import { NextResponse } from "next/server";
import { clearCart, getCartWithProducts, getOrCreateCartId } from "@/lib/cart";
import { isDemoMode } from "@/lib/db-config";
import { SHIPPING_RATES, STRIPE_TAX_ENABLED } from "@/lib/constants";
import { getPrisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  if (isDemoMode()) {
    return NextResponse.json(
      {
        error:
          "Checkout requires a database. Add your Neon/Supabase DATABASE_URL to .env, then run npm run db:push && npm run db:seed",
      },
      { status: 503 }
    );
  }

  try {
    const cartId = await getOrCreateCartId();
    const cart = await getCartWithProducts(cartId);
    const availableItems = cart.items.filter((item) => !item.isSold);

    if (!availableItems.length) {
      return NextResponse.json({ error: "Your cart is empty or items have sold" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const stripe = getStripe();

    const lineItems = availableItems.map((item) => ({
      price_data: {
        currency: "usd",
        unit_amount: item.priceCents,
        product_data: {
          name: item.name,
          description: `${item.collectionName} · One-of-a-kind hand-painted bottle`,
          images: item.images[0]?.startsWith("http")
            ? [item.images[0]]
            : [`${appUrl}${item.images[0] ?? "/images/placeholder-collection.svg"}`],
        },
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${appUrl}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cart`,
      customer_creation: "always",
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "IN", "DE", "FR", "IT", "ES", "NL", "NZ", "SG"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: SHIPPING_RATES.domestic.amountCents, currency: "usd" },
            display_name: SHIPPING_RATES.domestic.label,
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 10 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: SHIPPING_RATES.international.amountCents,
              currency: "usd",
            },
            display_name: SHIPPING_RATES.international.label,
            delivery_estimate: {
              minimum: { unit: "business_day", value: 10 },
              maximum: { unit: "business_day", value: 21 },
            },
          },
        },
      ],
      automatic_tax: { enabled: STRIPE_TAX_ENABLED },
      metadata: {
        cartId,
        productIds: availableItems.map((item) => item.productId).join(","),
      },
    });

    await getPrisma().order.create({
      data: {
        stripeSessionId: session.id,
        customerEmail: "pending@checkout.stripe",
        status: "pending",
        totalCents: availableItems.reduce((sum, item) => sum + item.priceCents, 0),
        items: {
          create: availableItems.map((item) => ({
            productId: item.productId,
            priceAtPurchase: item.priceCents,
          })),
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
