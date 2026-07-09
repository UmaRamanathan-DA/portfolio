import Image from "next/image";
import Link from "next/link";
import { productImageSrc } from "@/lib/format";

type CollectionCardProps = {
  slug: string;
  name: string;
  description: string;
  heroImage: string;
};

export function CollectionCard({ slug, name, description, heroImage }: CollectionCardProps) {
  return (
    <Link href={`/collections/${slug}`} className="card block shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square">
        <Image
          src={productImageSrc(heroImage)}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
      </div>
      <div className="p-4">
        <h2 className="text-lg font-semibold text-navy">{name}</h2>
        <p className="mt-1 text-sm text-charcoal/80">{description}</p>
      </div>
    </Link>
  );
}
