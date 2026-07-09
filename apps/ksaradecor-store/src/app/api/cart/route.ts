import { NextResponse } from "next/server";
import { z } from "zod";
import { getCartWithProducts, getOrCreateCartId } from "@/lib/cart";
import { prisma } from "@/lib/prisma";

const addSchema = z.object({
  productSlug: z.string().min(1),
});

export async function GET() {
  const cartId = await getOrCreateCartId();
  const cart = await getCartWithProducts(cartId);
  return NextResponse.json(cart);
}

export async function POST(request: Request) {
  const cartId = await getOrCreateCartId();
  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { slug: parsed.data.productSlug },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.isSold) {
    return NextResponse.json({ error: "This one-of-a-kind piece has sold" }, { status: 409 });
  }

  await prisma.cartLineItem.upsert({
    where: {
      cartSessionId_productId: {
        cartSessionId: cartId,
        productId: product.id,
      },
    },
    update: {},
    create: {
      cartSessionId: cartId,
      productId: product.id,
    },
  });

  const cart = await getCartWithProducts(cartId);
  return NextResponse.json({ message: "Added to cart", cart });
}

export async function DELETE(request: Request) {
  const cartId = await getOrCreateCartId();
  const { searchParams } = new URL(request.url);
  const productSlug = searchParams.get("productSlug");
  if (!productSlug) {
    return NextResponse.json({ error: "productSlug required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { slug: productSlug } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.cartLineItem.deleteMany({
    where: { cartSessionId: cartId, productId: product.id },
  });

  const cart = await getCartWithProducts(cartId);
  return NextResponse.json({ cart });
}
