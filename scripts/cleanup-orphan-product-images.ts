import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) throw new Error("Supabase service configuration is required.");

const apply = process.argv.includes("--apply");
if (apply && process.env.CONFIRM_ORPHAN_DELETE !== "true") {
  throw new Error("Set CONFIRM_ORPHAN_DELETE=true together with --apply to delete orphaned files.");
}

const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: rows, error: databaseError } = await supabase.from("product_images").select("storage_path");
if (databaseError) throw databaseError;
const referenced = new Set((rows ?? []).map((row) => row.storage_path));

const { data: productFolders, error: foldersError } = await supabase.storage.from("product-images").list("products", { limit: 1000 });
if (foldersError) throw foldersError;
const storedPaths: string[] = [];
for (const folder of productFolders ?? []) {
  const { data: files, error } = await supabase.storage.from("product-images").list(`products/${folder.name}`, { limit: 1000 });
  if (error) throw error;
  storedPaths.push(...(files ?? []).filter((file) => file.metadata).map((file) => `products/${folder.name}/${file.name}`));
}
const orphans = storedPaths.filter((path) => !referenced.has(path));

if (!apply) {
  console.log(JSON.stringify({ mode: "dry-run", orphanCount: orphans.length, orphans }, null, 2));
} else if (orphans.length) {
  const { error } = await supabase.storage.from("product-images").remove(orphans);
  if (error) throw error;
  console.log(JSON.stringify({ mode: "apply", deletedCount: orphans.length }, null, 2));
} else {
  console.log(JSON.stringify({ mode: "apply", deletedCount: 0 }, null, 2));
}
