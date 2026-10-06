import { describe, expect, it } from "vitest";
import { inspectImage } from "@/lib/images/inspect-image";
import { validateProductImageBatch } from "@/lib/images/upload-limits";

function pngHeader(width: number, height: number) {
  const buffer = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

describe("product image inspection", () => {
  it("accepts an image meeting the minimum dimensions", () => {
    expect(inspectImage(pngHeader(1600, 1200))).toEqual({ mimeType: "image/png", extension: "png", width: 1600, height: 1200 });
  });

  it("rejects undersized and disguised files", () => {
    expect(() => inspectImage(pngHeader(799, 1200))).toThrow("alespoň 800");
    expect(() => inspectImage(Buffer.from("not an image"))).toThrow("podporovaný obrázek");
  });
});

describe("product image upload limits", () => {
  it("keeps original files up to 12 MB and accepts a 48 MB batch", () => {
    expect(() => validateProductImageBatch([
      { size: 12 * 1024 * 1024 },
      { size: 12 * 1024 * 1024 },
      { size: 12 * 1024 * 1024 },
      { size: 12 * 1024 * 1024 }
    ])).not.toThrow();
  });

  it("rejects an oversized file or batch before reading it into memory", () => {
    expect(() => validateProductImageBatch([{ size: 12 * 1024 * 1024 + 1 }])).toThrow("12 MB");
    expect(() => validateProductImageBatch([
      { size: 12 * 1024 * 1024 },
      { size: 12 * 1024 * 1024 },
      { size: 12 * 1024 * 1024 },
      { size: 12 * 1024 * 1024 },
      { size: 1 }
    ])).toThrow("48 MB");
  });
});
