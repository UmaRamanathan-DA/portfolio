"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddToCartButton({
  productSlug,
  disabled = false,
  label = "Add to cart",
}: {
  productSlug: string;
  disabled?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not add to cart");
      setMessage("Added to cart");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className="btn-primary w-full min-h-[48px]"
      >
        {loading ? "Adding…" : label}
      </button>
      {message && <p className="text-center text-sm text-navy">{message}</p>}
    </div>
  );
}
