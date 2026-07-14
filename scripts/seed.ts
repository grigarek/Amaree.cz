import { createClient } from "@supabase/supabase-js";
import { categories, products } from "../src/lib/products";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running seed.");
}

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false }
});

async function main() {
  for (const category of categories) {
    await supabase.from("categories").upsert({
      slug: category.slug,
      name: category.name,
      description: category.description,
      active: category.active
    });
  }

  const { data: dbCategories, error } = await supabase.from("categories").select("id, slug");
  if (error) throw error;

  for (const product of products) {
    const category = dbCategories.find((item) => item.slug === product.category);
    if (!category) continue;

    const { data: dbProduct, error: productError } = await supabase
      .from("products")
      .upsert({
        slug: product.slug,
        name: product.name,
        short_description: product.shortDescription,
        long_description: product.longDescription,
        category_id: category.id,
        price: product.price,
        original_price: product.originalPrice,
        currency: product.currency,
        sku: product.sku,
        stock_quantity: product.stockQuantity,
        material: product.material,
        dimensions: product.dimensions,
        care: product.care,
        active: product.active,
        featured: product.featured
      })
      .select("id")
      .single();

    if (productError) throw productError;

    for (const image of product.images) {
      await supabase.from("product_images").insert({
        product_id: dbProduct.id,
        image_url: image.url,
        alt: image.alt,
        sort_order: image.sortOrder
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
