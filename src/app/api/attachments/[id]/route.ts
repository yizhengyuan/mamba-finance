import { fail, ok } from "@/lib/api/http";
import { logApiError, logBusinessEvent } from "@/lib/observability/audit-log";
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
      return fail("NOT_FOUND", `attachment not found: ${id}`, 404);
    }

    await prisma.attachment.delete({ where: { id } });
    await deleteAttachmentFileByUrl(attachment.fileUrl);

    logBusinessEvent("ORDER_ATTACHMENT_DELETED", {
      attachmentId: id,
    });
    return ok({ id, deleted: true });
  } catch (error) {
    logApiError(`DELETE /api/attachments/${id}`, error, { attachmentId: id });
    return fail("INTERNAL_SERVER_ERROR", "Failed to delete attachment", 500);
  }
}
