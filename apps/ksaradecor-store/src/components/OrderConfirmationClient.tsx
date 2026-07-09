"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/constants";
import { formatPrice, productImageSrc } from "@/lib/format";

type OrderData = {
  id: string;
  status: string;
  customerEmail: string;
  totalCents: number;
  items: Array<{
    name: string;
    priceCents: number;
    image: string;
    collectionName: string;
  }>;
};

export function OrderConfirmationClient({ sessionId }: { sessionId: string }) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 12;

    async function poll() {
      const response = await fetch(`/api/order/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
        if (data.status === "paid" || data.status === "cancelled") {
          setLoading(false);
          return;
        }
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setLoading(false);
      }
    }

    poll();
  }, [sessionId]);

  if (loading && !order) {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg font-medium">Processing your order…</p>
        <p className="mt-2 text-sm text-charcoal/70">Confirming payment — just a moment.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card p-8 text-center">
        <p>We could not find your order yet.</p>
        <Link href="/" className="btn-primary mt-4 inline-flex">
          Back to shop
        </Link>
      </div>
    );
  }

  if (order.status === "pending") {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg font-medium">Almost there…</p>
        <p className="mt-2 text-sm text-charcoal/70">
          Payment received — finishing up your order confirmation.
        </p>
      </div>
    );
  }

  if (order.status === "cancelled") {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg font-medium text-red-700">Order could not be completed</p>
        <p className="mt-2 text-sm">
          One or more pieces sold while you were checking out. You have not been charged for unavailable items.
        </p>
        <Link href="/" className="btn-primary mt-4 inline-flex">
          Browse what&apos;s available
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-6 text-center">
        <h1 className="text-2xl font-semibold text-navy">Thank you!</h1>
        <p className="mt-2">{BRAND.tagline}</p>
        <p className="mt-4 text-sm">
          Order <strong>#{order.id.slice(-8).toUpperCase()}</strong> is confirmed.
        </p>
        <p className="mt-2 text-sm text-charcoal/80">
          A receipt was sent to <strong>{order.customerEmail}</strong>. Each bottle is hand-painted and
          one-of-a-kind — yours is being prepared with care.
        </p>
        <p className="mt-3 text-xs text-charcoal/70">Estimated delivery: 7–14 business days after dispatch.</p>
      </div>

      <div className="space-y-3">
        {order.items.map((item) => (
          <div key={item.name} className="card flex gap-3 p-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-card">
              <Image
                src={productImageSrc(item.image)}
                alt={item.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-charcoal/70">{item.collectionName}</p>
              <p className="mt-1 text-sm font-semibold">{formatPrice(item.priceCents)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 text-right font-semibold">Total {formatPrice(order.totalCents)}</div>

      <Link href="/" className="btn-secondary block w-full text-center">
        Continue shopping
      </Link>
    </div>
  );
}
