import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const catalog = {
  collections: [
    {
      slug: "walrus",
      name: "Walrus Collection",
      description:
        "Playful walrus bottles — each one tells a story with tea, humour, and hand-painted charm.",
      heroImage: "/images/bottle_Walrus.png",
      products: [
        {
          slug: "walrus-tea-cup",
          name: "Walrus with Tea Cup",
          description: "Hand-painted walrus holding a cup of tea. One of a kind.",
          priceCents: 4800,
          images: ["/images/bottle_Walrus.png"],
          isSold: false,
        },
        {
          slug: "walrus-not-my-cup",
          name: "This is Not My Cup of Tea",
          description: "Deep blue bottle with walrus art and a cheeky message.",
          priceCents: 4800,
          images: ["/images/bottle_Walrus-1.png"],
          isSold: false,
        },
      ],
    },
    {
      slug: "crab",
      name: "Crab Collection",
      description: "Bold crab-themed bottles inspired by coastal life.",
      heroImage: "/images/collections/crab-collection.png",
      products: [
        {
          slug: "crab-red-claw",
          name: "Red Claw Crab Bottle",
          description: "Vibrant red crab on a recycled glass bottle.",
          priceCents: 4200,
          images: ["/images/collections/crab-red-claw.png"],
          isSold: false,
        },
        {
          slug: "crab-sandcastle",
          name: "Sandcastle Crab Bottle",
          description: "Beach-day crab scene painted by hand.",
          priceCents: 4200,
          images: ["/images/collections/crab-sandcastle.png"],
          isSold: false,
        },
      ],
    },
    {
      slug: "starfish",
      name: "Starfish Collection",
      description: "Soft pink starfish and ocean tones on upcycled glass.",
      heroImage: "/images/collections/starfish-collection.png",
      products: [
        {
          slug: "starfish-pink",
          name: "Pink Starfish Bottle",
          description: "Teal base with a pink starfish accent.",
          priceCents: 4500,
          images: ["/images/collections/starfish-pink.png"],
          isSold: false,
        },
        {
          slug: "starfish-coral",
          name: "Starfish & Coral Bottle",
          description: "Starfish paired with orange coral details.",
          priceCents: 4500,
          images: ["/images/collections/starfish-coral.png"],
          isSold: true,
        },
      ],
    },
    {
      slug: "fish",
      name: "Fish & Coral Collection",
      description: "Colourful fish, coral, and reef-inspired bottle art.",
      heroImage: "/images/collections/fish-collection.png",
      products: [
        {
          slug: "fish-yellow-stripe",
          name: "Yellow Stripe Fish Bottle",
          description: "Sunny yellow fish swimming through coral.",
          priceCents: 4400,
          images: ["/images/collections/fish-yellow-stripe.png"],
          isSold: false,
        },
        {
          slug: "fish-reef-garden",
          name: "Reef Garden Bottle",
          description: "A miniature reef garden painted with love.",
          priceCents: 4600,
          images: ["/images/collections/fish-reef-garden.png"],
          isSold: false,
        },
      ],
    },
  ],
};

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartLineItem.deleteMany();
  await prisma.cartSession.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();

  for (const collection of catalog.collections) {
    const created = await prisma.collection.create({
      data: {
        slug: collection.slug,
        name: collection.name,
        description: collection.description,
        heroImage: collection.heroImage,
        products: {
          create: collection.products.map((product) => ({
            slug: product.slug,
            name: product.name,
            description: product.description,
            priceCents: product.priceCents,
            images: product.images,
            isSold: product.isSold,
          })),
        },
      },
    });
    console.log(`Seeded ${created.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
