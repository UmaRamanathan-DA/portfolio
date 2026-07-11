import { cookies } from "next/headers";
import { getProduct } from "@/lib/catalog-store";
import { CART_COOKIE, CART_COOKIE_MAX_AGE } from "@/lib/constants";
import { isDemoMode } from "@/lib/db-config";
import {
  addDemoCartItem,
  getDemoCartId,
  getDemoCartWithProducts,
  removeDemoCartItem,
} from "@/lib/demo-cart";
import { getPrisma } from "@/lib/prisma";

export async function getOrCreateCartId(): Promise<string> {
  if (isDemoMode()) {
    return getDemoCartId();
  }

  const prisma = getPrisma();
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
  if (isDemoMode()) {
    return getDemoCartWithProducts();
  }

  const prisma = getPrisma();
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

export async function addToCart(productSlug: string) {
  const product = await getProduct(productSlug);
  if (!product) throw new Error("Product not found");
  if (product.isSold) throw new Error("This one-of-a-kind piece has sold");

  if (isDemoMode()) {
    await addDemoCartItem(productSlug);
    return getDemoCartWithProducts();
  }

  const cartId = await getOrCreateCartId();
  const prisma = getPrisma();
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
  return getCartWithProducts(cartId);
}

export async function removeFromCart(productSlug: string) {
  if (isDemoMode()) {
    await removeDemoCartItem(productSlug);
    return getDemoCartWithProducts();
  }

  const cartId = await getOrCreateCartId();
  const product = await getProduct(productSlug);
  if (!product) throw new Error("Product not found");

  const prisma = getPrisma();
  await prisma.cartLineItem.deleteMany({
    where: { cartSessionId: cartId, productId: product.id },
  });
  return getCartWithProducts(cartId);
}

export async function clearCart(cartId: string) {
  if (isDemoMode()) {
    const { clearDemoCart } = await import("@/lib/demo-cart");
    await clearDemoCart();
    return;
  }

  const prisma = getPrisma();
  await prisma.cartLineItem.deleteMany({ where: { cartSessionId: cartId } });
}
