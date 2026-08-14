import { createHash } from "node:crypto";

export const BILL_ATTACHMENT_TYPE = "electricity_bill";
export const BILL_FILE_STORE = "econ-fv-bill-files-v1";

export function leadIdForSession(sessionId) {
  return createHash("sha256").update(`econ-fv-v1:${sessionId}`).digest("hex").slice(0, 24);
}

export function billAttachmentIdForLead(leadId) {
  return `bill-${leadId}`;
}

export function billBlobKey(leadId, sha256) {
  return `lead/${leadId}/bill/${sha256}`;
}

export const __test = { BILL_ATTACHMENT_TYPE, BILL_FILE_STORE };
