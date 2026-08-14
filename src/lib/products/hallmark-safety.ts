const protectedHallmarkClaims = [
  /zkontrolov[aá]no puncovn[ií]m [uú]řadem/iu,
  /certifikov[aá]no puncovn[ií]m [uú]řadem/iu,
  /opatřen[oa]? českým puncem/iu,
  /stříbro\s*925/iu,
  /zlato\s*585/iu,
  /skontrolovan[eé] puncov[yý]m [uú]radom/iu,
  /certifikovan[eé] puncov[yý]m [uú]radom/iu,
  /opatren[eé] (?:česk[yý]m|slovensk[yý]m) puncom/iu,
  /striebro\s*925/iu
] as const;

export function containsProtectedHallmarkClaim(values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ");
  return protectedHallmarkClaims.some((pattern) => pattern.test(text));
}

export const protectedHallmarkClaimMessage = "Chráněné tvrzení o puncu nebo ryzosti lze zveřejnit až po ručním ověření podle dokumentace.";
