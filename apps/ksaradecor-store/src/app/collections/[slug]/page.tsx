import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { getCollection } from "@/lib/catalog-store";

export default async function CollectionPage({
  params,
}: {
  params: { slug: string };
}) {
  const collection = await getCollection(params.slug);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/" className="text-sm text-navy underline">
        ← All collections
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-navy">{collection.name}</h1>
      <p className="mt-2 max-w-2xl text-sm text-charcoal/85">{collection.description}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {collection.products.map((product) => (
          <ProductCard
            key={product.id}
            slug={product.slug}
            name={product.name}
            priceCents={product.priceCents}
            image={product.images[0] ?? "/images/placeholder-collection.svg"}
            isSold={product.isSold}
          />
        ))}
      </div>
    </div>
  );
}
