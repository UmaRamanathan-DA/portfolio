import { cookies } from "next/headers";
import { CART_COOKIE, CART_COOKIE_MAX_AGE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function getOrCreateCartId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CART_COOKIE)?.value;
  if (existing) {
    const session = await prisma.cartSession.findUnique({ where: { id: existing } });
    if (session) return existing;
  }

  const session = await prisma.cartSession.create({ data: {} });
  cookieStore.set(CART_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
    path: "/",
  });
  return session.id;
}

export async function getCartWithProducts(cartId: string) {
  const items = await prisma.cartLineItem.findMany({
    where: { cartSessionId: cartId },
    include: {
      product: {
        include: { collection: true },
      },
    },
    orderBy: { id: "asc" },
  });

  const lineItems = items.map((item) => ({
    id: item.id,
    productId: item.productId,
    slug: item.product.slug,
    name: item.product.name,
    description: item.product.description,
    priceCents: item.product.priceCents,
    images: item.product.images,
    isSold: item.product.isSold,
    collectionName: item.product.collection.name,
    quantity: 1,
    lineTotalCents: item.product.priceCents,
  }));

  const subtotalCents = lineItems
    .filter((item) => !item.isSold)
    .reduce((sum, item) => sum + item.lineTotalCents, 0);

  return {
    cartId,
    items: lineItems,
    itemCount: lineItems.length,
    subtotalCents,
  };
}

export async function clearCart(cartId: string) {
  await prisma.cartLineItem.deleteMany({ where: { cartSessionId: cartId } });
}
