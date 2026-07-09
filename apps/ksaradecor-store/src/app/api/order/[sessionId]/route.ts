import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  const order = await prisma.order.findUnique({
    where: { stripeSessionId: sessionId },
    include: {
      items: {
        include: {
          product: {
            include: { collection: true },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    shippingAddress: order.shippingAddress,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      name: item.product.name,
      slug: item.product.slug,
      priceCents: item.priceAtPurchase,
      image: item.product.images[0],
      collectionName: item.product.collection.name,
    })),
  });
}
