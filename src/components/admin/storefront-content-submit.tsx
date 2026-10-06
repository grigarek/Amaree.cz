"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useFormStatus } from "react-dom";

export function StorefrontContentSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      className="inline-flex min-h-12 items-center justify-center gap-2 justify-self-start bg-ruby px-7 font-redhat text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />}
      {pending ? "Nahrávám a ukládám…" : "Uložit obsah webu"}
    </button>
  );
}
