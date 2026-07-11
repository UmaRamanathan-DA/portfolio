import { cookies } from "next/headers";
import { getStaticProduct } from "@/data/catalog";
import { CART_COOKIE, CART_COOKIE_MAX_AGE } from "@/lib/constants";

const DEMO_CART_COOKIE = "ksd_demo_cart";

type DemoCart = {
  slugs: string[];
};

async function readDemoCart(): Promise<DemoCart> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(DEMO_CART_COOKIE)?.value;
  if (!raw) return { slugs: [] };
  try {
    const parsed = JSON.parse(raw) as DemoCart;
    return { slugs: Array.isArray(parsed.slugs) ? parsed.slugs : [] };
  } catch {
    return { slugs: [] };
  }
}

async function writeDemoCart(cart: DemoCart) {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getDemoCartId() {
  const cookieStore = await cookies();
  let cartId = cookieStore.get(CART_COOKIE)?.value;
  if (!cartId) {
    cartId = `demo-${crypto.randomUUID()}`;
    cookieStore.set(CART_COOKIE, cartId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: CART_COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return cartId;
}

export async function getDemoCartWithProducts() {
  const cartId = await getDemoCartId();
  const cart = await readDemoCart();

  const items = cart.slugs
    .map((slug) => getStaticProduct(slug))
    .filter((product): product is NonNullable<typeof product> => Boolean(product))
    .map((product) => ({
      id: product.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      images: product.images,
      isSold: product.isSold,
      collectionName: product.collectionName,
      quantity: 1,
      lineTotalCents: product.priceCents,
    }));

  const subtotalCents = items
    .filter((item) => !item.isSold)
    .reduce((sum, item) => sum + item.lineTotalCents, 0);

  return {
    cartId,
    items,
    itemCount: items.length,
    subtotalCents,
  };
}

export async function addDemoCartItem(productSlug: string) {
  const cart = await readDemoCart();
  if (!cart.slugs.includes(productSlug)) {
    cart.slugs.push(productSlug);
    await writeDemoCart(cart);
  }
}

export async function removeDemoCartItem(productSlug: string) {
  const cart = await readDemoCart();
  cart.slugs = cart.slugs.filter((slug) => slug !== productSlug);
  await writeDemoCart(cart);
}

export async function clearDemoCart() {
  await writeDemoCart({ slugs: [] });
}
