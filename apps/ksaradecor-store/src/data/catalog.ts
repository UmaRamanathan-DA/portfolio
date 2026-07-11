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
  {
    id: "col-crab",
    slug: "crab",
    name: "Crab Collection",
    description: "Bold crab-themed bottles inspired by coastal life.",
    heroImage: "/images/collections/crab-collection.png",
    products: [
      {
        id: "crab-red-claw",
        slug: "crab-red-claw",
        name: "Red Claw Crab Bottle",
        description: "Vibrant red crab on a recycled glass bottle.",
        priceCents: 4200,
        images: ["/images/collections/crab-red-claw.png"],
        isSold: false,
        collectionId: "col-crab",
        collectionSlug: "crab",
        collectionName: "Crab Collection",
      },
      {
        id: "crab-sandcastle",
        slug: "crab-sandcastle",
        name: "Sandcastle Crab Bottle",
        description: "Beach-day crab scene painted by hand.",
        priceCents: 4200,
        images: ["/images/collections/crab-sandcastle.png"],
        isSold: false,
        collectionId: "col-crab",
        collectionSlug: "crab",
        collectionName: "Crab Collection",
      },
    ],
  },
  {
    id: "col-starfish",
    slug: "starfish",
    name: "Starfish Collection",
    description: "Soft pink starfish and ocean tones on upcycled glass.",
    heroImage: "/images/collections/starfish-collection.png",
    products: [
      {
        id: "starfish-pink",
        slug: "starfish-pink",
        name: "Pink Starfish Bottle",
        description: "Teal base with a pink starfish accent.",
        priceCents: 4500,
        images: ["/images/collections/starfish-pink.png"],
        isSold: false,
        collectionId: "col-starfish",
        collectionSlug: "starfish",
        collectionName: "Starfish Collection",
      },
      {
        id: "starfish-coral",
        slug: "starfish-coral",
        name: "Starfish & Coral Bottle",
        description: "Starfish paired with orange coral details.",
        priceCents: 4500,
        images: ["/images/collections/starfish-coral.png"],
        isSold: true,
        collectionId: "col-starfish",
        collectionSlug: "starfish",
        collectionName: "Starfish Collection",
      },
    ],
  },
  {
    id: "col-fish",
    slug: "fish",
    name: "Fish & Coral Collection",
    description: "Colourful fish, coral, and reef-inspired bottle art.",
    heroImage: "/images/collections/fish-collection.png",
    products: [
      {
        id: "fish-yellow-stripe",
        slug: "fish-yellow-stripe",
        name: "Yellow Stripe Fish Bottle",
        description: "Sunny yellow fish swimming through coral.",
        priceCents: 4400,
        images: ["/images/collections/fish-yellow-stripe.png"],
        isSold: false,
        collectionId: "col-fish",
        collectionSlug: "fish",
        collectionName: "Fish & Coral Collection",
      },
      {
        id: "fish-reef-garden",
        slug: "fish-reef-garden",
        name: "Reef Garden Bottle",
        description: "A miniature reef garden painted with love.",
        priceCents: 4600,
        images: ["/images/collections/fish-reef-garden.png"],
        isSold: false,
        collectionId: "col-fish",
        collectionSlug: "fish",
        collectionName: "Fish & Coral Collection",
      },
    ],
  },
];

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
