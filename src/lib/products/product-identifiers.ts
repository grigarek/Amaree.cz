const transliteration: Record<string, string> = {
  đ: "d",
  ð: "d",
  ł: "l",
  ø: "o",
  ß: "ss",
  þ: "th"
};

export function toSeoSlug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("cs")
    .replace(/[đðłøßþ]/g, (character) => transliteration[character] ?? character)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110)
    .replace(/-+$/g, "");
}

export function productInitials(name: string) {
  const words = toSeoSlug(name).split("-").filter(Boolean);
  if (!words.length) return "PRD";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase().padEnd(3, "X");
  return words.map((word) => word[0]).join("").slice(0, 4).toUpperCase();
}

export function formatSku(sequence: number) {
  return String(sequence);
}

export function defaultSku(_name: string) {
  return formatSku(1001);
}

export function defaultSeoTitle(name: string) {
  if (!name.trim()) return "";
  const suffix = " | AMARÉE";
  return `${name.trim().slice(0, 70 - suffix.length)}${suffix}`.trim();
}

export function defaultSeoDescription(shortDescription: string) {
  return shortDescription.trim().replace(/\s+/g, " ").slice(0, 170).trim();
}
