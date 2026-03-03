import { AttachmentCategory } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { PayloadValidationError } from "@/lib/api/payload-validation-error";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export interface ParsedAttachmentUpload {
  category: AttachmentCategory;
  file: File;
}

export interface StoredAttachmentFile {
  originalFileName: string;
  storedFileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
}

export function parseAttachmentCategory(value: unknown): AttachmentCategory {
  if (typeof value !== "string") {
    throw new PayloadValidationError("category must be a string");
  }

  if (
    value === "transfer_receipt" ||
    value === "collateral_photo" ||
    value === "other"
  ) {
    return value;
  }

  throw new PayloadValidationError(
    "category must be one of: transfer_receipt, collateral_photo, other",
  );
}

function extFromFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpeg" || ext === ".jpg") {
    return ".jpg";
  }

  if (ext === ".png" || ext === ".webp" || ext === ".heic") {
    return ext;
  }

  return ".bin";
}

function assertUploadFile(file: unknown): asserts file is File {
  if (!(file instanceof File)) {
    throw new PayloadValidationError("file must be provided");
  }

  if (file.size <= 0) {
    throw new PayloadValidationError("file cannot be empty");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new PayloadValidationError("file cannot exceed 10MB");
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new PayloadValidationError(
      "file type must be one of: image/jpeg, image/png, image/webp, image/heic",
    );
  }
}

export function parseAttachmentUploadFormData(
  formData: FormData,
): ParsedAttachmentUpload {
  const category = parseAttachmentCategory(formData.get("category"));
  const fileValue = formData.get("file");

  assertUploadFile(fileValue);

  return {
    category,
    file: fileValue,
  };
}

export async function saveAttachmentFile(
  file: File,
  orderId: string,
): Promise<StoredAttachmentFile> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const storedFileName = `${orderId}-${randomUUID()}${extFromFileName(file.name)}`;
  const targetPath = path.join(UPLOAD_DIR, storedFileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(targetPath, bytes);

  return {
    originalFileName: file.name,
    storedFileName,
    fileUrl: `/uploads/${storedFileName}`,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export async function deleteAttachmentFileByUrl(fileUrl: string): Promise<void> {
  const prefix = "/uploads/";
  if (!fileUrl.startsWith(prefix)) {
    return;
  }

  const fileName = path.basename(fileUrl.slice(prefix.length));
  if (!fileName) {
    return;
  }

  const targetPath = path.join(UPLOAD_DIR, fileName);
  try {
    await unlink(targetPath);
  } catch {
    // Ignore missing file errors; database deletion should still succeed.
  }
}
