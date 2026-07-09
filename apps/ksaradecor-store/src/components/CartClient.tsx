"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice, productImageSrc } from "@/lib/format";

type CartItem = {
  slug: string;
  name: string;
  priceCents: number;
  images: string[];
  isSold: boolean;
  collectionName: string;
};

export function CartClient({
  items,
  subtotalCents,
}: {
  items: CartItem[];
  subtotalCents: number;
}) {
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableItems = items.filter((item) => !item.isSold);

  async function removeItem(slug: string) {
    await fetch(`/api/cart?productSlug=${slug}`, { method: "DELETE" });
    router.refresh();
  }

  async function checkout() {
    setCheckingOut(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setCheckingOut(false);
    }
  }

  if (!items.length) {
    return (
      <div className="card p-8 text-center">
        <p className="mb-4">Your cart is empty.</p>
        <Link href="/" className="btn-primary">
          Browse collections
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.slug} className="card flex gap-3 p-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-card">
            <Image
              src={productImageSrc(item.images[0])}
              alt={item.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{item.name}</p>
            <p className="text-xs text-charcoal/70">{item.collectionName}</p>
            <p className="mt-1 font-semibold">{formatPrice(item.priceCents)}</p>
            {item.isSold ? (
              <p className="mt-1 text-xs font-medium text-red-700">Sold — remove to continue</p>
            ) : (
              <p className="mt-1 text-xs text-charcoal/60">Qty: 1 (one-of-a-kind)</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.slug)}
            className="self-start text-sm text-navy underline"
          >
            Remove
          </button>
        </div>
      ))}

      <div className="card p-4">
        <div className="flex justify-between text-base font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(subtotalCents)}</span>
        </div>
        <p className="mt-2 text-xs text-charcoal/70">Shipping calculated at checkout.</p>
      </div>

      {error && <p className="text-center text-sm text-red-700">{error}</p>}

      <div className="sticky bottom-4 z-10">
        <button
          type="button"
          onClick={checkout}
          disabled={checkingOut || !availableItems.length}
          className="btn-primary w-full min-h-[52px] shadow-lg"
        >
          {checkingOut ? "Redirecting to Stripe…" : "Checkout"}
        </button>
      </div>
    </div>
  );
}
