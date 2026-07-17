export type InspectedImage = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

function inspectJpeg(buffer: Buffer): InspectedImage | null {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { mimeType: "image/jpeg", extension: "jpg", height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    if (length < 2) return null;
    offset += length + 2;
  }
  return null;
}

function inspectPng(buffer: Buffer): InspectedImage | null {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) return null;
  return { mimeType: "image/png", extension: "png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function inspectWebp(buffer: Buffer): InspectedImage | null {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { mimeType: "image/webp", extension: "webp", width, height };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { mimeType: "image/webp", extension: "webp", width, height };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { mimeType: "image/webp", extension: "webp", width, height };
  }
  return null;
}

export function inspectImage(buffer: Buffer): InspectedImage {
  const result = inspectPng(buffer) ?? inspectJpeg(buffer) ?? inspectWebp(buffer);
  if (!result) throw new Error("Soubor není podporovaný obrázek JPG, PNG nebo WebP.");
  if (result.width < 800 || result.height < 800) throw new Error("Fotografie musí mít alespoň 800 × 800 px.");
  if (result.width > 12000 || result.height > 12000) throw new Error("Fotografie může mít nejvýše 12 000 × 12 000 px.");
  return result;
}
