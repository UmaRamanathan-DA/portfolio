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
    // Add more collections here once new pieces are photographed —
    // each product needs a real file under /public/images first.
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
