import {
  CatalogCollection,
  CatalogProduct,
  getStaticCollection,
  getStaticCollections,
  getStaticProduct,
} from "@/data/catalog";
import { isDatabaseConfigured } from "@/lib/db-config";
import { getPrisma } from "@/lib/prisma";

export async function listCollections(): Promise<CatalogCollection[]> {
  if (!isDatabaseConfigured()) {
    return getStaticCollections();
  }

  const prisma = getPrisma();
  const collections = await prisma.collection.findMany({
    orderBy: { name: "asc" },
    include: {
      products: { orderBy: { createdAt: "asc" } },
    },
  });

  return collections.map((collection) => ({
    id: collection.id,
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    heroImage: collection.heroImage,
    products: collection.products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      images: product.images,
      isSold: product.isSold,
      collectionId: collection.id,
      collectionSlug: collection.slug,
      collectionName: collection.name,
    })),
  }));
}

export async function getCollection(slug: string): Promise<CatalogCollection | null> {
  if (!isDatabaseConfigured()) {
    return getStaticCollection(slug) ?? null;
  }

  const prisma = getPrisma();
  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: { products: { orderBy: { createdAt: "asc" } } },
  });

  if (!collection) return null;

  return {
    id: collection.id,
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    heroImage: collection.heroImage,
    products: collection.products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      images: product.images,
      isSold: product.isSold,
      collectionId: collection.id,
      collectionSlug: collection.slug,
      collectionName: collection.name,
    })),
  };
}

export async function getProduct(slug: string): Promise<CatalogProduct | null> {
  if (!isDatabaseConfigured()) {
    return getStaticProduct(slug) ?? null;
  }

  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { collection: true },
  });

  if (!product) return null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    images: product.images,
    isSold: product.isSold,
    collectionId: product.collectionId,
    collectionSlug: product.collection.slug,
    collectionName: product.collection.name,
  };
}

export async function getProductById(id: string): Promise<CatalogProduct | null> {
  if (!isDatabaseConfigured()) {
    for (const collection of getStaticCollections()) {
      const product = collection.products.find((item) => item.id === id);
      if (product) return product;
    }
    return null;
  }

  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { id },
    include: { collection: true },
  });

  if (!product) return null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    images: product.images,
    isSold: product.isSold,
    collectionId: product.collectionId,
    collectionSlug: product.collection.slug,
    collectionName: product.collection.name,
  };
}
