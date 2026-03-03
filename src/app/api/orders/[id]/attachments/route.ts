import { fail, ok } from "@/lib/api/http";
import { PayloadValidationError } from "@/lib/api/payload-validation-error";
import { logApiError, logBusinessEvent } from "@/lib/observability/audit-log";
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
      return fail("NOT_FOUND", `order not found: ${orderId}`, 404);
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

    logBusinessEvent("ORDER_ATTACHMENT_UPLOADED", {
      orderId,
      attachmentId: attachment.id,
      category: attachment.category,
      sizeBytes: Number(attachment.sizeBytes),
    });

    return ok(attachment, 201);
  } catch (error) {
    if (savedFileUrl) {
      await deleteAttachmentFileByUrl(savedFileUrl);
    }

    if (error instanceof PayloadValidationError) {
      return fail("BAD_REQUEST", error.message, 400);
    }

    logApiError(`POST /api/orders/${orderId}/attachments`, error, { orderId });
    return fail("INTERNAL_SERVER_ERROR", "Failed to upload attachment", 500);
  }
}
