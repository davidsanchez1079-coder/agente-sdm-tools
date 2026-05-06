"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function CompartirContenido() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const loginHref = useMemo(() => {
    if (!token) return "/";
    const next = `/app/caso/compartir?t=${encodeURIComponent(token)}`;
    return `/?next=${encodeURIComponent(next)}`;
  }, [token]);

  if (!token) {
    return (
      <p className="text-sm text-slate-300">
        Falta el identificador del enlace. Pide al gerente que vuelva a copiar
        el enlace desde el caso.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      <p className="text-sm leading-7 text-slate-300">
        Te han compartido un caso en GOTIA. Guarda o copia este enlace y
        compártelo por el canal que quieras. Para abrir el caso necesitas
        iniciar sesión con el{" "}
        <strong className="text-slate-100">mismo correo</strong> al que se
        envió la invitación en el workspace.
      </p>
      <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Enlace
        </p>
        <p className="mt-2 break-all font-mono text-xs text-cyan-200">
          {origin
            ? `${origin}/compartir?t=${encodeURIComponent(token)}`
            : "…"}
        </p>
        <button
          type="button"
          className="mt-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
          onClick={() => {
            if (!origin) return;
            const url = `${origin}/compartir?t=${encodeURIComponent(token)}`;
            void navigator.clipboard.writeText(url);
          }}
        >
          Copiar enlace
        </button>
      </div>
      <Link
        href={loginHref}
        className="inline-flex w-fit rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
      >
        Iniciar sesión y abrir el caso
      </Link>
    </div>
  );
}

export default function CompartirPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-8 px-6 py-16">
        <div className="inline-flex w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-300">
          GOTIA · enlace compartido
        </div>
        <Suspense
          fallback={
            <p className="text-sm text-slate-400">Cargando enlace…</p>
          }
        >
          <CompartirContenido />
        </Suspense>
        <Link
          href="/"
          className="text-sm font-medium text-slate-500 transition hover:text-slate-300"
        >
          ← Volver al inicio
        </Link>
      </section>
    </main>
  );
}
