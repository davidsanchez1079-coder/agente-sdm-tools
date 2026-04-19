"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientEnv } from "@/lib/env";

export function AuthShell() {
  const env = getClientEnv();
  const isConfigured = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const supabase = useMemo(
    () => (isConfigured ? getSupabaseBrowserClient() : null),
    [isConfigured],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"signin" | "signup" | null>(null);

  async function handleAuth(mode: "signin" | "signup") {
    if (!supabase) {
      setMessage("Faltan variables públicas de Supabase en el entorno.");
      return;
    }

    setLoading(mode);
    setMessage(null);

    const response =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (response.error) {
      setMessage(response.error.message);
      setLoading(null);
      return;
    }

    setMessage(
      mode === "signup"
        ? "Cuenta creada. Revise su correo si Supabase pide confirmación."
        : "Sesión iniciada correctamente.",
    );
    setLoading(null);
  }

  return (
    <section className="grid gap-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
          Acceso base
        </p>
        <h2 className="text-2xl font-semibold text-white">Conexión inicial con Supabase</h2>
        <p className="text-sm leading-7 text-slate-300">
          Este bloque deja listo el login base para Fase 1. Todavía no define roles,
          workspace ni lógica de negocio.
        </p>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAuth("signin");
        }}
      >
        <label className="grid gap-2 text-sm text-slate-200">
          Correo
          <input
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-cyan-400"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usted@empresa.com"
            required
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-200">
          Contraseña
          <input
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-cyan-400"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            required
            minLength={8}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading !== null}
          >
            {loading === "signin" ? "Procesando..." : "Entrar"}
          </button>

          <button
            className="rounded-2xl border border-slate-700 px-4 py-3 font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={() => void handleAuth("signup")}
            disabled={loading !== null}
          >
            {loading === "signup" ? "Procesando..." : "Crear cuenta"}
          </button>
        </div>
      </form>

      {message ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
          {message}
        </div>
      ) : null}
    </section>
  );
}
