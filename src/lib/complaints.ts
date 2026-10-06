export type ComplaintRecord = {
  complaintNumber: string;
  orderId: string;
  submittedAt: string;
  deadlineAt: string;
  defectDescription: string;
  requestedResolution: string;
  status: "received";
};

export function createComplaintRecord(input: {
  orderId: string;
  orderNumber: string;
  sequence: number;
  submittedAt: Date;
  defectDescription: string;
  requestedResolution: string;
}): ComplaintRecord {
  if (!Number.isInteger(input.sequence) || input.sequence < 1) throw new Error("invalid_complaint_sequence");
  const deadline = new Date(input.submittedAt);
  deadline.setUTCDate(deadline.getUTCDate() + 30);
  const orderDigits = input.orderNumber.replace(/\D/g, "").slice(-8) || "00000000";
  return {
    complaintNumber: `AMR-REC-${orderDigits}-${String(input.sequence).padStart(3, "0")}`,
    orderId: input.orderId,
    submittedAt: input.submittedAt.toISOString(),
    deadlineAt: deadline.toISOString(),
    defectDescription: input.defectDescription,
    requestedResolution: input.requestedResolution,
    status: "received"
  };
}
