export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  images: string[];
  isSold: boolean;
  collectionId: string;
  collectionSlug: string;
  collectionName: string;
};

export type CatalogCollection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  heroImage: string;
  products: CatalogProduct[];
};

const catalog: CatalogCollection[] = [
  {
    id: "col-walrus",
    slug: "walrus",
    name: "Walrus Collection",
    description:
      "Playful walrus bottles — each one tells a story with tea, humour, and hand-painted charm.",
    heroImage: "/images/bottle_Walrus.png",
    products: [
      {
        id: "walrus-tea-cup",
        slug: "walrus-tea-cup",
        name: "Walrus with Tea Cup",
        description: "Hand-painted walrus holding a cup of tea. One of a kind.",
        priceCents: 4800,
        images: ["/images/bottle_Walrus.png"],
        isSold: false,
        collectionId: "col-walrus",
        collectionSlug: "walrus",
        collectionName: "Walrus Collection",
      },
      {
        id: "walrus-not-my-cup",
        slug: "walrus-not-my-cup",
        name: "This is Not My Cup of Tea",
        description: "Deep blue bottle with walrus art and a cheeky message.",
        priceCents: 4800,
        images: ["/images/bottle_Walrus-1.png"],
        isSold: false,
        collectionId: "col-walrus",
        collectionSlug: "walrus",
        collectionName: "Walrus Collection",
      },
    ],
  },
];

/**
 * More collections (crab, starfish, fish, etc.) go here as new pieces are
 * photographed. Each entry needs real product images in /public/images —
 * do not add a collection without them, or product pages will 404 on image load.
 */

export function getStaticCollections(): CatalogCollection[] {
  return catalog;
}

export function getStaticCollection(slug: string): CatalogCollection | undefined {
  return catalog.find((collection) => collection.slug === slug);
}

export function getStaticProduct(slug: string): CatalogProduct | undefined {
  for (const collection of catalog) {
    const product = collection.products.find((item) => item.slug === slug);
    if (product) return product;
  }
  return undefined;
}

export function getStaticProductMap(): Map<string, CatalogProduct> {
  const map = new Map<string, CatalogProduct>();
  for (const collection of catalog) {
    for (const product of collection.products) {
      map.set(product.slug, product);
    }
  }
  return map;
}
