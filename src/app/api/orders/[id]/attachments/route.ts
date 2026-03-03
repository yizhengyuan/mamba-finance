import { NextResponse } from "next/server";

import { PayloadValidationError } from "@/lib/api/payload-validation-error";
import { prisma } from "@/lib/prisma";
import {
  parseAttachmentUploadFormData,
  saveAttachmentFile,
  deleteAttachmentFileByUrl,
} from "@/lib/storage/attachment-storage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id: orderId } = await context.params;

  let savedFileUrl: string | undefined;
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `order not found: ${orderId}` },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const parsed = parseAttachmentUploadFormData(formData);
    const stored = await saveAttachmentFile(parsed.file, orderId);
    savedFileUrl = stored.fileUrl;

    const attachment = await prisma.attachment.create({
      data: {
        orderId,
        category: parsed.category,
        fileName: stored.originalFileName,
        fileUrl: stored.fileUrl,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
      },
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    if (savedFileUrl) {
      await deleteAttachmentFileByUrl(savedFileUrl);
    }

    if (error instanceof PayloadValidationError) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: error.message },
        { status: 400 },
      );
    }

    console.error(`POST /api/orders/${orderId}/attachments failed`, error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to upload attachment" },
      { status: 500 },
    );
  }
}
