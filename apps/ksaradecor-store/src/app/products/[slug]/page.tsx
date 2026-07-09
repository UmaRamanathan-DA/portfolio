import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ImageGallery } from "@/components/ImageGallery";
import { SoldBadge } from "@/components/SoldBadge";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { collection: true },
  });

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link
        href={`/collections/${product.collection.slug}`}
        className="text-sm text-navy underline"
      >
        ← {product.collection.name}
      </Link>

      <div className="relative mt-4">
        <ImageGallery images={product.images} alt={product.name} />
        {product.isSold && (
          <div className="pointer-events-none absolute left-4 top-4">
            <SoldBadge />
          </div>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <h1 className="text-2xl font-semibold text-navy">{product.name}</h1>
        <p className="text-xl font-semibold">{formatPrice(product.priceCents)}</p>
        <p className="text-sm leading-relaxed text-charcoal/85">{product.description}</p>
        <p className="text-xs text-charcoal/60">One-of-a-kind · Hand-painted · Qty 1 only</p>

        {product.isSold ? (
          <div className="card p-4 text-center text-sm">
            <p className="font-medium">This piece has found its home.</p>
            <p className="mt-1 text-charcoal/70">Browse other bottles still available.</p>
            <Link href={`/collections/${product.collection.slug}`} className="btn-secondary mt-4 inline-flex">
              View collection
            </Link>
          </div>
        ) : (
          <AddToCartButton productSlug={product.slug} />
        )}
      </div>
    </div>
  );
}
