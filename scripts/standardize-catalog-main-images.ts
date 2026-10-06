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
      cs: "Růžový náramek Rosée na bílém pozadí",
      sk: "Ružový náramok Rosée na bielom pozadí",
      en: "Rosée pink bracelet on a white background",
      de: "Rosa Rosée Armband auf weißem Hintergrund"
    }
  },
  {
    sku: "AMR-BRC-CLO-BLK-001",
    path: "public/products/amaree-clover-bracelet-black/main-white.png",
    alt: {
      cs: "Černý náramek Minuit na bílém pozadí",
      sk: "Čierny náramok Minuit na bielom pozadí",
      en: "Minuit black bracelet on a white background",
      de: "Schwarzes Minuit Armband auf weißem Hintergrund"
    }
  },
  {
    sku: "AMR-BRC-TEN-SLV-001",
    path: "public/products/amaree-tennis-bracelet-silver/main-white.png",
    alt: {
      cs: "Stříbrný náramek Lueur na bílém pozadí",
      sk: "Strieborný náramok Lueur na bielom pozadí",
      en: "Lueur silver bracelet on a white background",
      de: "Lueur Armband in Silber auf weißem Hintergrund"
    }
  },
  {
    sku: "AMR-EAR-CLO-BLK-001",
    path: "public/products/amaree-clover-earrings-black/main-white.png",
    alt: {
      cs: "Černé náušnice Minuit na bílém pozadí",
      sk: "Čierne náušnice Minuit na bielom pozadí",
      en: "Minuit black earrings on a white background",
      de: "Schwarze Minuit Ohrringe auf weißem Hintergrund"
    }
  },
  {
    sku: "1006",
    path: "public/products/amaree-clover-earrings-pink/main-white.png",
    alt: {
      cs: "Růžové náušnice Rosée na bílém pozadí",
      sk: "Ružové náušnice Rosée na bielom pozadí",
      en: "Rosée pink earrings on a white background",
      de: "Rosa Rosée Ohrringe auf weißem Hintergrund"
    }
  },
  {
    sku: "AMR-NCL-CLO-BLK-001",
    path: "public/products/amaree-clover-necklace-black/main-white.png",
    alt: {
      cs: "Černý náhrdelník Minuit na bílém pozadí",
      sk: "Čierny náhrdelník Minuit na bielom pozadí",
      en: "Minuit black necklace on a white background",
      de: "Schwarze Minuit Halskette auf weißem Hintergrund"
    }
  },
  {
    sku: "AMR-NCL-CLO-PNK-001",
    path: "public/products/amaree-clover-necklace-pink/main-white.png",
    alt: {
      cs: "Růžový náhrdelník Rosée na bílém pozadí",
      sk: "Ružový náhrdelník Rosée na bielom pozadí",
      en: "Rosée pink necklace on a white background",
      de: "Rosa Rosée Halskette auf weißem Hintergrund"
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
