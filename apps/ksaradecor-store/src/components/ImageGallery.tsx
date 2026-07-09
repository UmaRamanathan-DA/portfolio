"use client";

import Image from "next/image";
import { useState } from "react";
import { productImageSrc } from "@/lib/format";

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-white">
        <Image
          src={productImageSrc(current)}
          alt={alt}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <button
              key={image}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-card border-2 ${
                i === index ? "border-navy" : "border-transparent"
              }`}
            >
              <Image src={productImageSrc(image)} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
