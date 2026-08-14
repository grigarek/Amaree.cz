export type RecoverySessionParams = {
  accessToken: string;
  refreshToken: string;
  type: "invite" | "recovery";
};

export function parseRecoverySession(hash: string): RecoverySessionParams | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");

  if (!accessToken || !refreshToken || (type !== "invite" && type !== "recovery")) return null;
  return { accessToken, refreshToken, type };
}
