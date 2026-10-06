"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import { parseRecoverySession } from "@/lib/admin/recovery-session";

export function RecoverySessionBridge() {
  const [message, setMessage] = useState("Ověřujeme bezpečný odkaz…");

  useEffect(() => {
    let active = true;

    async function establishSession() {
      const session = parseRecoverySession(window.location.hash);
      window.history.replaceState(null, "", window.location.pathname);

      if (!session) {
        window.location.replace("/admin/login?error=invalid");
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        window.location.replace("/admin/login?error=not-configured");
        return;
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken
      });

      if (!active) return;
      if (error) {
        setMessage("Odkaz není platný nebo už vypršel.");
        window.location.replace("/admin/login?error=invalid");
        return;
      }

      window.location.replace("/admin/set-password");
    }

    void establishSession();
    return () => {
      active = false;
    };
  }, []);

  return <p className="font-redhat text-sm leading-6 text-muted" role="status">{message}</p>;
}
