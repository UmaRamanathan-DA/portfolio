export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { CollectionCard } from "@/components/CollectionCard";
import { BRAND } from "@/lib/constants";
import { listCollections } from "@/lib/catalog-store";
import { productImageSrc } from "@/lib/format";

export default async function HomePage() {
  const collections = await listCollections();

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="ocean-hero -mx-4 px-4 py-10 text-center sm:-mx-0 sm:rounded-card sm:px-8">
        <div className="ocean-hero-content">
          <p className="text-sm font-medium uppercase tracking-widest text-teal">{BRAND.tagline}</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            {BRAND.name}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-white/85">{BRAND.subtitle}</p>
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
          <p className="mx-auto mt-4 max-w-lg text-sm text-white/80">
            Each bottle is rescued, cleaned, and hand-painted to order — made-to-order pieces for
            everyday collectors, corporate gifting, and event favours.
          </p>
        </div>
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
          <Link
            href="/gifting"
            className="card flex flex-col justify-center gap-2 border border-navy/15 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-navy">Corporate &amp; event gifting</h2>
            <p className="text-sm text-charcoal/80">
              Bulk orders for client gifts and event favours — request pricing and lead time.
            </p>
            <span className="mt-2 text-sm font-medium text-navy underline">Start an inquiry →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
