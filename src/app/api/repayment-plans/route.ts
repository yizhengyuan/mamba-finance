import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { parseRepaymentPlanQuery } from "@/lib/api/repayment-plan-query";
import { PayloadValidationError } from "@/lib/api/payload-validation-error";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseRepaymentPlanQuery({
      date: searchParams.get("date") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const now = new Date();
    const where: Prisma.RepaymentPlanWhereInput = {
      ...(parsed.status === "overdue"
        ? {
            status: { in: ["pending", "overdue"] },
            dueDate: { lt: parsed.dateEnd ?? now },
          }
        : {
            ...(parsed.status ? { status: parsed.status } : {}),
          }),
      ...(parsed.dateStart && parsed.dateEnd
        ? {
            dueDate: {
              gte: parsed.dateStart,
              lt: parsed.dateEnd,
            },
          }
        : {}),
    };

    const repaymentPlans = await prisma.repaymentPlan.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { periodIndex: "asc" }],
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            borrowerName: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ data: repaymentPlans });
  } catch (error) {
    if (error instanceof PayloadValidationError) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: error.message },
        { status: 400 },
      );
    }

    console.error("GET /api/repayment-plans failed", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch repayment plans",
      },
      { status: 500 },
    );
  }
}
