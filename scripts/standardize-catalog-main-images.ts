import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { inspectImage } from "../src/lib/images/inspect-image";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) throw new Error("Supabase není nakonfigurovaný.");

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const catalogImages = [
  {
    sku: "AMA-LCB-001",
    path: "public/products/amaree-clover-bracelet-pink/main-white.png",
    alt: {
      cs: "Růžový náramek AMARÉE Rosé na bílém pozadí",
      sk: "Ružový náramok AMARÉE Rosé na bielom pozadí",
      en: "AMARÉE Rosé pink bracelet on a white background",
      de: "Rosa AMARÉE Rosé Armband auf weißem Hintergrund"
    }
  },
  {
    sku: "AMR-BRC-CLO-BLK-001",
    path: "public/products/amaree-clover-bracelet-black/main-white.png",
    alt: {
      cs: "Černý náramek AMARÉE Noir na bílém pozadí",
      sk: "Čierny náramok AMARÉE Noir na bielom pozadí",
      en: "AMARÉE Noir black bracelet on a white background",
      de: "Schwarzes AMARÉE Noir Armband auf weißem Hintergrund"
    }
  },
  {
    sku: "AMR-BRC-TEN-SLV-001",
    path: "public/products/amaree-tennis-bracelet-silver/main-white.png",
    alt: {
      cs: "Stříbrný náramek AMARÉE Halo na bílém pozadí",
      sk: "Strieborný náramok AMARÉE Halo na bielom pozadí",
      en: "AMARÉE Halo silver bracelet on a white background",
      de: "AMARÉE Halo Armband in Silber auf weißem Hintergrund"
    }
  },
  {
    sku: "AMR-EAR-CLO-BLK-001",
    path: "public/products/amaree-clover-earrings-black/main-white.png",
    alt: {
      cs: "Černé náušnice AMARÉE Noir na bílém pozadí",
      sk: "Čierne náušnice AMARÉE Noir na bielom pozadí",
      en: "AMARÉE Noir black earrings on a white background",
      de: "Schwarze AMARÉE Noir Ohrringe auf weißem Hintergrund"
    }
  },
  {
    sku: "1006",
    path: "public/products/amaree-clover-earrings-pink/main-white.png",
    alt: {
      cs: "Růžové náušnice AMARÉE Rosé na bílém pozadí",
      sk: "Ružové náušnice AMARÉE Rosé na bielom pozadí",
      en: "AMARÉE Rosé pink earrings on a white background",
      de: "Rosa AMARÉE Rosé Ohrringe auf weißem Hintergrund"
    }
  },
  {
    sku: "AMR-NCL-CLO-BLK-001",
    path: "public/products/amaree-clover-necklace-black/main-white.png",
    alt: {
      cs: "Černý náhrdelník AMARÉE Noir na bílém pozadí",
      sk: "Čierny náhrdelník AMARÉE Noir na bielom pozadí",
      en: "AMARÉE Noir black necklace on a white background",
      de: "Schwarze AMARÉE Noir Halskette auf weißem Hintergrund"
    }
  },
  {
    sku: "AMR-NCL-CLO-PNK-001",
    path: "public/products/amaree-clover-necklace-pink/main-white.png",
    alt: {
      cs: "Růžový náhrdelník AMARÉE Rosé na bílém pozadí",
      sk: "Ružový náhrdelník AMARÉE Rosé na bielom pozadí",
      en: "AMARÉE Rosé pink necklace on a white background",
      de: "Rosa AMARÉE Rosé Halskette auf weißem Hintergrund"
    }
  }
] as const;

async function main() {
const requestedSku = process.env.CATALOG_SKU;
const selectedImages = requestedSku ? catalogImages.filter((image) => image.sku === requestedSku) : catalogImages;

if (requestedSku && selectedImages.length === 0) throw new Error(`SKU ${requestedSku} není v seznamu katalogových fotografií.`);

for (const catalogImage of selectedImages) {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("sku", catalogImage.sku)
    .single();

  if (productError || !product) throw productError ?? new Error(`Produkt ${catalogImage.sku} nebyl nalezen.`);

  const { data: image, error: imageError } = await supabase
    .from("product_images")
    .select("id,storage_path")
    .eq("product_id", product.id)
    .eq("is_primary", true)
    .is("archived_at", null)
    .single();

  if (imageError || !image) throw imageError ?? new Error(`Hlavní fotografie ${catalogImage.sku} nebyla nalezena.`);

  const buffer = await readFile(catalogImage.path);
  const inspected = inspectImage(buffer);
  const storagePath = `products/${product.id}/${image.id}-catalog-white.png`;
  const { error: uploadError } = await supabase.storage.from("product-images").upload(storagePath, buffer, {
    contentType: inspected.mimeType,
    cacheControl: "31536000",
    upsert: true
  });

  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from("product_images")
    .update({
      storage_path: storagePath,
      original_filename: basename(catalogImage.path),
      mime_type: inspected.mimeType,
      size_bytes: buffer.length,
      width: inspected.width,
      height: inspected.height
    })
    .eq("id", image.id);

  if (updateError) throw updateError;

  for (const [locale, altText] of Object.entries(catalogImage.alt)) {
    const { error: altError } = await supabase
      .from("product_image_translations")
      .upsert({ image_id: image.id, locale, alt_text: altText }, { onConflict: "image_id,locale" });

    if (altError) throw altError;
  }

  console.log(`Aktualizováno: ${catalogImage.sku}`);
}

console.log(`Hotovo: ${selectedImages.length} hlavních katalogových fotografií.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
