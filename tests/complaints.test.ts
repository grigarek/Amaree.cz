import { describe, expect, it } from "vitest";
import { createComplaintRecord } from "@/lib/complaints";

describe("complaint records", () => {
  it("creates an evidence number and a 30-day deadline", () => {
    expect(createComplaintRecord({
      orderId: "order-1",
      orderNumber: "AMR-2026-0001",
      sequence: 1,
      submittedAt: new Date("2026-07-15T10:00:00.000Z"),
      defectDescription: "Vadné zapínání",
      requestedResolution: "Oprava"
    })).toMatchObject({
      complaintNumber: "AMR-REC-20260001-001",
      deadlineAt: "2026-08-14T10:00:00.000Z",
      status: "received"
    });
  });
});
