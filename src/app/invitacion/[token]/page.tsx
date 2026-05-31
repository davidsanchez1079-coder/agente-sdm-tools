"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  acceptInvitation,
  previewInvitation,
  type InvitationPreview,
  type WorkspaceMemberRol,
} from "@/lib/permisos/permisos-db";
import { formatError } from "@/lib/errors/format";

const ROL_LABEL: Record<WorkspaceMemberRol, string> = {
  gerente: "Gerente",
  interno: "Interno",
  externo: "Externo",
};

const ROL_DESC: Record<WorkspaceMemberRol, string> = {
  gerente: "Verás todo el workspace y podrás administrar accesos.",
  interno:
    "Verás los casos que tú crees y los que otros miembros te compartan explícitamente.",
  externo: "Verás solo casos relacionados con las marcas que te asignaron.",
};

function getAuthErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" && code.length > 0 ? code : null;
  }
  return null;
}

function isUserAlreadyRegistered(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  if (code === "user_already_registered") return true;
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: unknown }).message).toLowerCase();
    return (
      msg.includes("already registered") ||
      msg.includes("user already registered")
    );
  }
  return false;
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

function authErrorMessage(error: unknown, fallback: string): string {
  const code = getAuthErrorCode(error);
  if (code === "email_not_confirmed") {
    return "Revisa tu correo para confirmar tu cuenta y luego vuelve a este link.";
  }
  if (code === "user_already_registered" || isUserAlreadyRegistered(error)) {
    return "Ya tienes cuenta con este correo. Verifica tu contraseña.";
  }
  if (code === "weak_password") {
    return "La contraseña no cumple los requisitos mínimos de seguridad.";
  }
  if (code === "over_request_rate_limit") {
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  }
  return formatError(error, fallback);
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [working, setWorking] = useState<"continue" | "accept" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [previewData, userData] = await Promise.all([
          previewInvitation(supabase, token),
          supabase.auth.getUser(),
        ]);
        if (cancelled) return;
        setPreview(previewData);
        setAuthedEmail(userData.data.user?.email ?? null);
        if (!previewData) {
          setPreviewError(
            "Esta invitación no existe, ya fue aceptada o expiró. Pide al gerente del workspace que te genere un link nuevo.",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(
            formatError(error, "No se pudo leer la invitación."),
          );
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleContinue() {
    if (!preview || !token) return;
    if (password.length < 8) {
      setMessage("Usa una contraseña de al menos 8 caracteres.");
      return;
    }

    setWorking("continue");
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    const email = preview.email;
    const redirectTo = `${window.location.origin}/invitacion/${token}`;

    try {
      const signIn = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signIn.error) {
        await runAccept();
        return;
      }

      const signInCode = getAuthErrorCode(signIn.error);
      if (signInCode !== "invalid_credentials") {
        setMessage(
          authErrorMessage(signIn.error, "No se pudo iniciar sesión."),
        );
        setWorking(null);
        return;
      }

      const signUp = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });

      if (signUp.error) {
        if (isUserAlreadyRegistered(signUp.error)) {
          setMessage(
            "Ya tienes cuenta con este correo. Verifica tu contraseña.",
          );
        } else {
          setMessage(
            authErrorMessage(signUp.error, "No se pudo crear la cuenta."),
          );
        }
        setWorking(null);
        return;
      }

      if (signUp.data.session) {
        await runAccept();
        return;
      }

      setMessage(
        "Revisa tu correo para confirmar tu cuenta y luego vuelve a este link.",
      );
      setWorking(null);
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo completar el acceso a tu cuenta."),
      );
      setWorking(null);
    }
  }

  async function runAccept() {
    if (!token) return;
    setWorking("accept");
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await acceptInvitation(supabase, token);
      router.replace("/app");
    } catch (error) {
      console.error("acceptInvitation failed", error);
      const parts: string[] = [];
      if (error && typeof error === "object") {
        const e = error as Record<string, unknown>;
        if (typeof e.code === "string" && e.code) parts.push(`[${e.code}]`);
        if (typeof e.message === "string" && e.message) parts.push(e.message);
        if (typeof e.details === "string" && e.details)
          parts.push(`details: ${e.details}`);
        if (typeof e.hint === "string" && e.hint)
          parts.push(`hint: ${e.hint}`);
      }
      setMessage(
        parts.length > 0
          ? `No se pudo aceptar la invitación. ${parts.join(" ")}`
          : `No se pudo aceptar la invitación. ${String(error)}`,
      );
      setWorking(null);
    }
  }

  const isBusy = working !== null;

  if (previewLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-50">
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Spinner className="h-5 w-5" />
          Cargando invitación…
        </p>
      </main>
    );
  }

  if (previewError || !preview) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-50">
        <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-rose-300">
            Invitación inválida
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            No pudimos abrir esta invitación
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {previewError ??
              "Esta invitación no existe, ya fue aceptada o expiró."}
          </p>
        </div>
      </main>
    );
  }

  const emailMatchesAuth =
    authedEmail !== null &&
    authedEmail.toLowerCase() === preview.email.toLowerCase();

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-10 text-slate-50">
      <div className="grid w-full max-w-md gap-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-cyan-950/10">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
            GOTIA · invitación
          </p>
          <h1 className="text-2xl font-semibold text-white">
            Te invitaron al workspace
          </h1>
          <p className="text-sm leading-7 text-slate-300">
            Como <span className="font-semibold">{ROL_LABEL[preview.rol]}</span>.
            {" "}
            {ROL_DESC[preview.rol]}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Correo invitado
          </p>
          <p className="mt-1 text-slate-100">{preview.email}</p>
        </div>

        {emailMatchesAuth ? (
          <button
            type="button"
            onClick={() => void runAccept()}
            disabled={isBusy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {working === "accept" ? (
              <>
                <Spinner />
                Aceptando…
              </>
            ) : (
              "Aceptar invitación"
            )}
          </button>
        ) : authedEmail ? (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            Estás logueado como <span className="font-semibold">{authedEmail}</span>,
            pero esta invitación es para <span className="font-semibold">{preview.email}</span>.
            Cierra sesión y entra con el correo correcto para poder aceptarla.
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleContinue();
            }}
          >
            <p className="text-sm leading-6 text-slate-300">
              Ingresa tu contraseña para{" "}
              <span className="font-semibold">{preview.email}</span> y activar
              tu acceso.
            </p>
            <label className="grid gap-2 text-sm text-slate-200">
              Contraseña
              <input
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-cyan-400"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                autoComplete="new-password"
                disabled={isBusy}
              />
            </label>
            <button
              type="submit"
              disabled={isBusy || password.length < 8}
              className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? (
                <>
                  <Spinner />
                  {working === "accept" ? "Aceptando…" : "Continuando…"}
                </>
              ) : (
                "Continuar"
              )}
            </button>
          </form>
        )}

        {message ? (
          <div
            role="alert"
            className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
