import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  parseUpdateAccountPayload,
  PayloadValidationError,
} from "@/lib/api/account-payload";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const payload = await request.json();
    const input = parseUpdateAccountPayload(payload);

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return NextResponse.json({ data: account });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `account not found: ${id}` },
        { status: 404 },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "invalid JSON body",
        },
        { status: 400 },
      );
    }

    if (error instanceof PayloadValidationError) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: error.message,
        },
        { status: 400 },
      );
    }

    console.error(`PATCH /api/accounts/${id} failed`, error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to update account" },
      { status: 500 },
    );
  }
}
