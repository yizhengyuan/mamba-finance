import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  parseCreateOrderPayload,
  parseOrderStatusFilter,
} from "@/lib/api/order-payload";
import { PayloadValidationError } from "@/lib/api/payload-validation-error";
import { generateOrderNo } from "@/lib/domain/order-number";
import { generateRepaymentPlans } from "@/lib/domain/repayment-plan-generator";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = parseOrderStatusFilter(searchParams.get("status"));

    const orders = await prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        repaymentPlans: {
          where: {
            status: { in: ["pending", "overdue"] },
          },
          orderBy: { dueDate: "asc" },
          take: 1,
          select: {
            id: true,
            dueDate: true,
            totalDue: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ data: orders });
  } catch (error) {
    if (error instanceof PayloadValidationError) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: error.message },
        { status: 400 },
      );
    }

    console.error("GET /api/orders failed", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = parseCreateOrderPayload(payload);
    const orderNo = generateOrderNo();

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNo,
          borrowerName: input.borrowerName,
          borrowerPhone: input.borrowerPhone,
          principal: input.principal,
          monthlyRate: input.monthlyRate,
          startDate: input.startDate,
          months: input.months,
          collateralDesc: input.collateralDesc,
          notes: input.notes,
          status: "active",
        },
      });

      const planDrafts = generateRepaymentPlans({
        principal: input.principal,
        monthlyRate: input.monthlyRate,
        startDate: input.startDate,
        months: input.months,
      });

      await tx.repaymentPlan.createMany({
        data: planDrafts.map((plan) => ({
          orderId: order.id,
          periodIndex: plan.periodIndex,
          dueDate: plan.dueDate,
          principalDue: plan.principalDue,
          interestDue: plan.interestDue,
          totalDue: plan.totalDue,
          status: plan.status,
        })),
      });

      const repaymentPlans = await tx.repaymentPlan.findMany({
        where: { orderId: order.id },
        orderBy: { periodIndex: "asc" },
      });

      return {
        ...order,
        repaymentPlans,
      };
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "invalid JSON body" },
        { status: 400 },
      );
    }

    if (error instanceof PayloadValidationError) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: error.message },
        { status: 400 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "CONFLICT",
          message: "generated orderNo conflicts, please retry",
        },
        { status: 409 },
      );
    }

    console.error("POST /api/orders failed", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to create order" },
      { status: 500 },
    );
  }
}
