import { createHash } from "node:crypto";
import { env } from "./_shared/env.js";
import { sameOriginRequest, json } from "./_shared/http.js";
import { safeSessionId } from "./_shared/sanitize.js";
import { dataStore } from "./_shared/blob-store.js";
import { normalizeBillProcessing } from "./_shared/bill-processing.js";
import {
  BILL_ATTACHMENT_TYPE,
  BILL_FILE_STORE,
  billAttachmentIdForLead,
  billBlobKey,
  leadIdForSession,
} from "./_shared/lead-identity.js";

const BILL_STORE_CONTRACT = "econ-fv-bill-files-v1";
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_PROCESSING_JSON_CHARS = 2000;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MANIFEST_SUFFIX = "bill/manifest";

function assertBillStoreContract() {
  if (BILL_FILE_STORE !== BILL_STORE_CONTRACT) throw new Error("bill_store_contract_mismatch");
}

function cleanFilename(value) {
  const raw = String(value || "bolletta").replace(/[\\/\0\r\n]/g, "_").trim();
  return (raw || "bolletta").slice(0, 180);
}

function inferredType(name, supplied) {
  const type = String(supplied || "").toLowerCase().trim();
  if (ALLOWED_TYPES.has(type)) return type;
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (/\.jpe?g$/.test(lower)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "";
}

function manifestKey(leadId) {
  return `lead/${leadId}/${MANIFEST_SUFFIX}`;
}

function sameDescriptor(a, b) {
  return Boolean(a && b && a.attachment_id === b.attachment_id && a.sha256 === b.sha256 && a.blob_key === b.blob_key);
}

function processingFromForm(value) {
  const raw = String(value || "").trim();
  if (!raw) return normalizeBillProcessing();
  if (raw.length > MAX_PROCESSING_JSON_CHARS) throw new Error("bill_processing_too_large");
  try {
    return normalizeBillProcessing(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("invalid_bill_processing");
    throw error;
  }
}

export default async (request) => {
  if (request.method !== "POST") return json({ detail: "method_not_allowed" }, 405);
  if (!sameOriginRequest(request)) return json({ detail: "origin_not_allowed" }, 403);

  try {
    assertBillStoreContract();
    const form = await request.formData();
    const sessionId = safeSessionId(form.get("session_id"));
    const file = form.get("file");
    const privacyAcknowledged = String(form.get("privacy_acknowledged") || "") === "true";
    const privacyVersion = String(form.get("privacy_version") || "").trim();
    const expectedPrivacyVersion = String(env("ECON_PRIVACY_VERSION") || "").trim();
    const processing = processingFromForm(form.get("processing"));

    if (!sessionId) return json({ detail: "invalid_session_id" }, 400);
    if (!privacyAcknowledged) return json({ detail: "privacy_ack_required" }, 400);
    if (!expectedPrivacyVersion || privacyVersion !== expectedPrivacyVersion) return json({ detail: "privacy_version_mismatch" }, 409);
    if (!file || typeof file.arrayBuffer !== "function") return json({ detail: "bill_file_required" }, 400);

    const size = Number(file.size || 0);
    if (!Number.isFinite(size) || size <= 0) return json({ detail: "empty_bill_file" }, 400);
    if (size > MAX_FILE_BYTES) return json({ detail: "bill_file_too_large" }, 413);

    const originalFilename = cleanFilename(file.name);
    const contentType = inferredType(originalFilename, file.type);
    if (!contentType) return json({ detail: "unsupported_bill_file_type" }, 415);

    const bytes = await file.arrayBuffer();
    const sha256 = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
    const leadId = leadIdForSession(sessionId);
    const attachmentId = billAttachmentIdForLead(leadId);
    const blobKey = billBlobKey(leadId, sha256);
    const store = dataStore(BILL_FILE_STORE, { consistency: "strong" });
    const mKey = manifestKey(leadId);
    const previous = await store.get(mKey, { type: "json" });
    const previousBlob = previous?.blob_key ? await store.getMetadata(previous.blob_key) : null;

    const uploadedAt = sameDescriptor(previous, { attachment_id: attachmentId, sha256, blob_key: blobKey }) && previousBlob
      ? previous.uploaded_at
      : new Date().toISOString();

    const descriptor = {
      schema: "econ.bill.attachment.v1",
      attachment_id: attachmentId,
      lead_id: leadId,
      attachment_type: BILL_ATTACHMENT_TYPE,
      blob_store: BILL_FILE_STORE,
      blob_key: blobKey,
      original_filename: originalFilename,
      content_type: contentType,
      size_bytes: size,
      sha256,
      uploaded_at: uploadedAt,
      privacy_version: privacyVersion,
      processing,
    };

    const deduplicated = Boolean(sameDescriptor(previous, descriptor) && previousBlob);
    if (!deduplicated) {
      await store.set(blobKey, bytes, {
        metadata: {
          attachment_id: attachmentId,
          lead_id: leadId,
          attachment_type: BILL_ATTACHMENT_TYPE,
          content_type: contentType,
          size_bytes: size,
          sha256,
          uploaded_at: uploadedAt,
          privacy_version: privacyVersion,
        },
      });
    }
    await store.setJSON(mKey, descriptor);
    if (!deduplicated && previous?.blob_key && previous.blob_key !== blobKey) await store.delete(previous.blob_key);

    return json({ ok: true, attachment: descriptor, deduplicated }, deduplicated ? 200 : 201);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "bill_archive_failed";
    console.error("ECON bill archive failed", detail);
    const clientError = ["bill_processing_too_large", "invalid_bill_processing"].includes(detail);
    return json({ detail: clientError ? detail : "bill_archive_failed" }, clientError ? 400 : 500);
  }
};

export const config = {
  path: "/api/bill-attachments",
  rateLimit: { windowLimit: 12, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export const __test = {
  MAX_FILE_BYTES,
  MAX_PROCESSING_JSON_CHARS,
  cleanFilename,
  inferredType,
  manifestKey,
  sameDescriptor,
  processingFromForm,
};
