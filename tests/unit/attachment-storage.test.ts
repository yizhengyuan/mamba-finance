import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAttachmentCategory,
  parseAttachmentUploadFormData,
} from "../../src/lib/storage/attachment-storage.ts";
import { PayloadValidationError } from "../../src/lib/api/payload-validation-error.ts";

test("parseAttachmentCategory accepts valid enum values", () => {
  assert.equal(parseAttachmentCategory("transfer_receipt"), "transfer_receipt");
  assert.equal(parseAttachmentCategory("collateral_photo"), "collateral_photo");
  assert.equal(parseAttachmentCategory("other"), "other");
});

test("parseAttachmentCategory rejects invalid value", () => {
  assert.throws(() => parseAttachmentCategory("foo"), PayloadValidationError);
});

test("parseAttachmentUploadFormData parses valid form data", () => {
  const file = new File([Buffer.from("hello")], "receipt.jpg", {
    type: "image/jpeg",
  });

  const formData = new FormData();
  formData.set("category", "transfer_receipt");
  formData.set("file", file);

  const parsed = parseAttachmentUploadFormData(formData);

  assert.equal(parsed.category, "transfer_receipt");
  assert.equal(parsed.file.name, "receipt.jpg");
  assert.equal(parsed.file.type, "image/jpeg");
});

test("parseAttachmentUploadFormData rejects unsupported mime type", () => {
  const file = new File([Buffer.from("hello")], "receipt.gif", {
    type: "image/gif",
  });

  const formData = new FormData();
  formData.set("category", "transfer_receipt");
  formData.set("file", file);

  assert.throws(() => parseAttachmentUploadFormData(formData), PayloadValidationError);
});

test("parseAttachmentUploadFormData rejects empty file", () => {
  const file = new File([Buffer.alloc(0)], "receipt.jpg", {
    type: "image/jpeg",
  });

  const formData = new FormData();
  formData.set("category", "transfer_receipt");
  formData.set("file", file);

  assert.throws(() => parseAttachmentUploadFormData(formData), PayloadValidationError);
});
