import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { deleteAttachmentFileByUrl } from "@/lib/storage/attachment-storage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      select: {
        id: true,
        fileUrl: true,
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `attachment not found: ${id}` },
        { status: 404 },
      );
    }

    await prisma.attachment.delete({ where: { id } });
    await deleteAttachmentFileByUrl(attachment.fileUrl);

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error(`DELETE /api/attachments/${id} failed`, error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to delete attachment" },
      { status: 500 },
    );
  }
}
