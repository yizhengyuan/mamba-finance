import { NextResponse } from "next/server";

import {
  parseCreateAccountPayload,
  PayloadValidationError,
} from "@/lib/api/account-payload";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: accounts });
  } catch (error) {
    console.error("GET /api/accounts failed", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch accounts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = parseCreateAccountPayload(payload);

    const account = await prisma.account.create({
      data: {
        name: input.name,
        type: input.type,
        currency: "CNY",
        openingBalance: input.openingBalance,
        currentBalance: input.openingBalance,
      },
    });

    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
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

    console.error("POST /api/accounts failed", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to create account" },
      { status: 500 },
    );
  }
}
