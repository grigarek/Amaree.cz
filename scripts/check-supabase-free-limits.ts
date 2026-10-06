import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) throw new Error("Supabase service configuration is required.");

const databaseWarningBytes = Number(process.env.SUPABASE_DATABASE_WARNING_BYTES ?? 400 * 1024 * 1024);
const storageWarningBytes = Number(process.env.SUPABASE_STORAGE_WARNING_BYTES ?? 800 * 1024 * 1024);
const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.rpc("get_project_usage");
if (error) throw error;

const usage = data as {
  database_bytes: number;
  storage_bytes: number;
  storage_objects: number;
  products: number;
  orders: number;
};

const warnings = [
  usage.database_bytes >= databaseWarningBytes ? "Database is above the configured warning threshold." : null,
  usage.storage_bytes >= storageWarningBytes ? "Storage is above the configured warning threshold." : null
].filter(Boolean);

console.log(JSON.stringify({ usage, thresholds: { databaseWarningBytes, storageWarningBytes }, warnings }, null, 2));
if (warnings.length) process.exitCode = 2;
