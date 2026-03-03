import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        repaymentPlans: {
          orderBy: { periodIndex: "asc" },
        },
        attachments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `order not found: ${id}` },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error(`GET /api/orders/${id} failed`, error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch order" },
      { status: 500 },
    );
  }
}
