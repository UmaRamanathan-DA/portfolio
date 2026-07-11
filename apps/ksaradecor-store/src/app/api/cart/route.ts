import { NextResponse } from "next/server";
import { z } from "zod";
import { addToCart, getCartWithProducts, getOrCreateCartId, removeFromCart } from "@/lib/cart";

const addSchema = z.object({
  productSlug: z.string().min(1),
});

export async function GET() {
  const cartId = await getOrCreateCartId();
  const cart = await getCartWithProducts(cartId);
  return NextResponse.json(cart);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const cart = await addToCart(parsed.data.productSlug);
    return NextResponse.json({ message: "Added to cart", cart });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add to cart";
    const status = message.includes("sold") ? 409 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const productSlug = searchParams.get("productSlug");
  if (!productSlug) {
    return NextResponse.json({ error: "productSlug required" }, { status: 400 });
  }

  try {
    const cart = await removeFromCart(productSlug);
    return NextResponse.json({ cart });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update cart";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
