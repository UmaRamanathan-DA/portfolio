import Image from "next/image";
import Link from "next/link";
import { SoldBadge } from "@/components/SoldBadge";
import { formatPrice, productImageSrc } from "@/lib/format";

type ProductCardProps = {
  slug: string;
  name: string;
  priceCents: number;
  image: string;
  isSold: boolean;
};

export function ProductCard({ slug, name, priceCents, image, isSold }: ProductCardProps) {
  return (
    <Link href={`/products/${slug}`} className="card relative block shadow-sm">
      <div className="relative aspect-square">
        <Image
          src={productImageSrc(image)}
          alt={name}
          fill
          className={`object-cover ${isSold ? "opacity-70" : ""}`}
          sizes="(max-width: 640px) 50vw, 33vw"
        />
        {isSold && <SoldBadge />}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium leading-snug">{name}</h3>
        <p className="mt-1 text-sm font-semibold">{formatPrice(priceCents)}</p>
      </div>
    </Link>
  );
}
