"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function ResolverEnlace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const [status, setStatus] = useState<"idle" | "working" | "fail">("idle");

  useEffect(() => {
    if (!token) {
      setStatus("fail");
      return;
    }
    let cancelled = false;
    (async () => {
      setStatus("working");
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("resolve_share_link_access", {
        token_input: token,
      });
      if (cancelled) return;
      if (error || !data || typeof data !== "string") {
        setStatus("fail");
        return;
      }
      router.replace(`/app/caso/${data}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (!token) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Enlace incompleto. Usa el enlace completo que te compartieron.
      </p>
    );
  }

  if (status === "working" || status === "idle") {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Abriendo el caso…
      </p>
    );
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-amber-500/30 bg-amber-50/80 p-5 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
      <p>
        No pudimos abrir el caso con este enlace. Comprueba que iniciaste
        sesión con el <strong>mismo correo</strong> al que se compartió el
        caso, que el enlace no fue revocado y que sigues teniendo acceso al
        workspace.
      </p>
      <Link
        href={`/compartir?t=${encodeURIComponent(token)}`}
        className="font-medium text-cyan-700 underline dark:text-cyan-300"
      >
        Volver a la página del enlace
      </Link>
    </div>
  );
}

export default function CasoCompartirPage() {
  return (
    <section className="mx-auto max-w-lg">
      <Suspense
        fallback={
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Cargando…
          </p>
        }
      >
        <ResolverEnlace />
      </Suspense>
    </section>
  );
}
