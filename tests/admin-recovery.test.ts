import { describe, expect, it } from "vitest";
import { parseRecoverySession } from "@/lib/admin/recovery-session";

describe("admin recovery session", () => {
  it("accepts recovery and invite session fragments", () => {
    expect(parseRecoverySession("#access_token=access&refresh_token=refresh&type=recovery")).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      type: "recovery"
    });
    expect(parseRecoverySession("access_token=access&refresh_token=refresh&type=invite")?.type).toBe("invite");
  });

  it("rejects incomplete or unrelated URL fragments", () => {
    expect(parseRecoverySession("#type=recovery&access_token=access")).toBeNull();
    expect(parseRecoverySession("#access_token=access&refresh_token=refresh&type=signup")).toBeNull();
  });
});
