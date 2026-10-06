import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bucket = "private-compliance-documents";
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180);
}

function extension(file: File) {
  const byType: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  return byType[file.type] ?? "bin";
}

function validateFile(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error("Doklad musí být PDF, JPG, PNG nebo WebP.");
  if (file.size > maxBytes) throw new Error("Doklad může mít nejvýše 10 MB.");
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Neoprávněný přístup." }, { status: 401 });
  const { id } = await params;
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "supplier" && kind !== "certificate") return NextResponse.json({ error: "Neplatný typ dokumentu." }, { status: 422 });
  const pathColumn = kind === "supplier" ? "supplier_document_path" : "product_certificate_path";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("product_material_compliance").select(pathColumn).eq("product_id", id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Dokument nebyl nalezen." }, { status: 404 });
  const path = data[pathColumn as keyof typeof data];
  if (typeof path !== "string" || !path) return NextResponse.json({ error: "Dokument nebyl nalezen." }, { status: 404 });
  const { data: signed, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: "Dokument se nepodařilo otevřít." }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Neoprávněný přístup." }, { status: 401 });
  const { id } = await params;
  const formData = await request.formData();
  const supabase = await createSupabaseServerClient();
  const { data: current, error: currentError } = await supabase
    .from("product_material_compliance")
    .select("supplier_document_path,product_certificate_path")
    .eq("product_id", id)
    .maybeSingle();
  if (currentError || !current) return NextResponse.json({ error: "Nejprve uložte produktové údaje." }, { status: 404 });

  const updates: Record<string, string | null> = {};
  const removePaths: string[] = [];
  const uploadedPaths: string[] = [];
  try {
    for (const kind of ["supplier", "certificate"] as const) {
      const file = formData.get(kind);
      const pathColumn = kind === "supplier" ? "supplier_document_path" : "product_certificate_path";
      const filenameColumn = kind === "supplier" ? "supplier_document_filename" : "product_certificate_filename";
      const oldPath = current[pathColumn];
      if (formData.get(`remove-${kind}`) === "true") {
        updates[pathColumn] = null;
        updates[filenameColumn] = null;
        if (oldPath) removePaths.push(oldPath);
      }
      if (!(file instanceof File) || file.size === 0) continue;
      validateFile(file);
      const path = `products/${id}/${kind}-${crypto.randomUUID()}.${extension(file)}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      updates[pathColumn] = path;
      updates[filenameColumn] = safeName(file.name);
      if (oldPath) removePaths.push(oldPath);
    }
    if (Object.keys(updates).length) {
      const { error: updateError } = await supabase.from("product_material_compliance").update(updates).eq("product_id", id);
      if (updateError) throw updateError;
    }
    if (removePaths.length) await supabase.storage.from(bucket).remove([...new Set(removePaths)]);
    revalidatePath(`/admin/products/${id}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(bucket).remove(uploadedPaths);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Doklady se nepodařilo uložit." }, { status: 500 });
  }
}
