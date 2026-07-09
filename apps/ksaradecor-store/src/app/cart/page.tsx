import { CartClient } from "@/components/CartClient";
import { getCartWithProducts, getOrCreateCartId } from "@/lib/cart";

export default async function CartPage() {
  const cartId = await getOrCreateCartId();
  const cart = await getCartWithProducts(cartId);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-2xl font-semibold text-navy">Your cart</h1>
      <p className="mt-1 text-sm text-charcoal/75">Each bottle is unique — max 1 per piece.</p>
      <div className="mt-5">
        <CartClient items={cart.items} subtotalCents={cart.subtotalCents} />
      </div>
    </div>
  );
}
