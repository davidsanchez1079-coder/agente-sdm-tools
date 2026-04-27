"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientEnv } from "@/lib/env";
import { isEmailAllowedForSignIn } from "@/lib/auth/allowed-emails";

export function AuthShell() {
  const env = getClientEnv();
  const isConfigured = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const supabase = useMemo(
    () => (isConfigured ? getSupabaseBrowserClient() : null),
    [isConfigured],
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"signin" | "signup" | null>(null);

  const authStatus = searchParams.get("auth");
  const callbackMessage =
    authStatus === "confirmed"
      ? "Correo confirmado correctamente. Ya puede iniciar sesión."
      : authStatus === "missing-code"
        ? "El enlace de confirmación llegó incompleto. Pida uno nuevo."
        : authStatus === "workspace-error"
          ? "Inició sesión pero falló la preparación del workspace. Inténtelo de nuevo."
          : null;

  async function handleAuth(mode: "signin" | "signup") {
    if (!supabase) {
      setMessage("Faltan variables públicas de Supabase en el entorno.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setLoading(mode);
    setMessage(null);

    const allowed = await isEmailAllowedForSignIn(supabase, normalizedEmail);
    if (!allowed) {
      setMessage(
        "Este correo no tiene acceso al sistema. Pide a un gerente que te invite por correo desde la pestaña Accesos.",
      );
      setLoading(null);
      return;
    }

    const response =
      mode === "signup"
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
        : await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

    if (response.error) {
      setMessage(response.error.message);
      setLoading(null);
      return;
    }

    if (mode === "signin" && response.data.session) {
      router.replace("/app");
      return;
    }

    setMessage("Cuenta creada. Revise su correo si Supabase pide confirmación.");
    setLoading(null);
  }

  return (
    <section className="grid gap-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
          Acceso controlado
        </p>
        <h2 className="text-2xl font-semibold text-white">
          Solo usuarios autorizados
        </h2>
        <p className="text-sm leading-7 text-slate-300">
          El acceso quedó restringido a correos autorizados. El registro abierto
          ya no está disponible en esta etapa.
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
            className="rounded-2xl border border-slate-700 px-4 py-3 font-medium text-slate-500 transition disabled:cursor-not-allowed"
            type="button"
            disabled
          >
            Solo usuarios autorizados
          </button>
        </div>
      </form>

      {message || callbackMessage ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
          {message ?? callbackMessage}
        </div>
      ) : null}
    </section>
  );
}
