export const dynamic = "force-dynamic";

import Image from "next/image";
import { CollectionCard } from "@/components/CollectionCard";
import { BRAND } from "@/lib/constants";
import { listCollections } from "@/lib/catalog-store";
import { productImageSrc } from "@/lib/format";

export default async function HomePage() {
  const collections = await listCollections();

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="py-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-navy">Mobile-first webshop</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-charcoal sm:text-4xl">
          {BRAND.name}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-charcoal/85">{BRAND.tagline}</p>
        <div className="relative mx-auto mt-6 aspect-[16/10] max-w-xl overflow-hidden rounded-card">
          <Image
            src={productImageSrc("/images/bottlepaint-2.png")}
            alt="Ksara Decor hand-painted bottles"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 640px"
            priority
          />
        </div>
        <p className="mx-auto mt-4 max-w-lg text-sm text-charcoal/80">
          One-of-a-kind upcycled glass bottles, hand-painted with coastal marine themes. When a piece sells,
          it&apos;s gone for good.
        </p>
      </section>

      <section className="pb-10">
        <h2 className="mb-4 text-lg font-semibold text-navy">Collections</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              slug={collection.slug}
              name={collection.name}
              description={collection.description}
              heroImage={collection.heroImage}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
