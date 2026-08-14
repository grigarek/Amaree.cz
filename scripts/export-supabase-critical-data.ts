import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) throw new Error("Supabase service configuration is required.");

const outputDirectory = resolve(process.argv[2] ?? "backups/supabase-critical");
const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
const tables = [
  "admin_users", "categories", "category_translations", "products", "product_translations",
  "product_prices", "product_variants", "product_variant_translations", "product_variant_prices",
  "inventory_items", "inventory_movements", "product_images", "product_image_translations",
  "orders", "order_items", "stock_reservations", "payments", "payment_status_history",
  "shipments", "order_status_history", "email_messages", "discount_codes", "discount_redemptions",
  "complaints", "complaint_status_history", "shipping_options", "payment_options"
];
const optionalTables = ["integration_settings", "product_slug_aliases"];

async function exportTable(table: string, optional = false) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + 999);
    if (error) {
      if (optional && error.code === "PGRST205") return null;
      throw new Error(`${table}: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  await writeFile(join(outputDirectory, "tables", `${table}.json`), JSON.stringify(rows, null, 2));
  return rows.length;
}

async function exportStorage(path = ""): Promise<number> {
  const { data, error } = await supabase.storage.from("product-images").list(path, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw new Error(`storage:${path}: ${error.message}`);
  let count = 0;

  for (const entry of data ?? []) {
    const storagePath = path ? `${path}/${entry.name}` : entry.name;
    if (!entry.metadata) {
      count += await exportStorage(storagePath);
      continue;
    }

    const { data: blob, error: downloadError } = await supabase.storage.from("product-images").download(storagePath);
    if (downloadError) throw new Error(`storage:${storagePath}: ${downloadError.message}`);
    const target = join(outputDirectory, "storage", "product-images", storagePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await blob.arrayBuffer()));
    count += 1;
  }
  return count;
}

async function main() {
  await mkdir(join(outputDirectory, "tables"), { recursive: true });
  const tableCounts: Record<string, number | null> = {};
  for (const table of tables) tableCounts[table] = await exportTable(table);
  for (const table of optionalTables) tableCounts[table] = await exportTable(table, true);
  const storageObjects = await exportStorage();
  const manifest = { createdAt: new Date().toISOString(), projectUrl: url, tableCounts, storageObjects };
  await writeFile(join(outputDirectory, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
