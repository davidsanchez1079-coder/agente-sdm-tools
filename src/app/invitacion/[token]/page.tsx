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

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [working, setWorking] = useState<"signin" | "signup" | "accept" | null>(
    null,
  );
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
            error instanceof Error
              ? error.message
              : "No se pudo leer la invitación.",
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

  async function handleSignUp() {
    if (!preview || !token) return;
    if (password.length < 8) {
      setMessage("Usa una contraseña de al menos 8 caracteres.");
      return;
    }
    setWorking("signup");
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: preview.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/invitacion/${token}`,
        },
      });
      if (error) throw error;
      if (data.session) {
        await runAccept();
      } else {
        setMessage(
          "Cuenta creada. Revisa tu correo si Supabase pide confirmación, luego abre de nuevo este link para aceptar.",
        );
        setWorking(null);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear la cuenta.",
      );
      setWorking(null);
    }
  }

  async function handleSignIn() {
    if (!preview) return;
    setWorking("signin");
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: preview.email,
        password,
      });
      if (error) throw error;
      await runAccept();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión.",
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
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo aceptar la invitación.",
      );
      setWorking(null);
    }
  }

  if (previewLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-50">
        <p className="text-sm text-slate-400">Cargando invitación…</p>
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
            disabled={working !== null}
            className="rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {working === "accept" ? "Aceptando…" : "Aceptar invitación"}
          </button>
        ) : authedEmail ? (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            Estás logueado como <span className="font-semibold">{authedEmail}</span>,
            pero esta invitación es para <span className="font-semibold">{preview.email}</span>.
            Cierra sesión y entra con el correo correcto para poder aceptarla.
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-slate-300">
              Crea tu cuenta o inicia sesión con <span className="font-semibold">{preview.email}</span> para activar tu acceso.
            </p>
            <label className="grid gap-2 text-sm text-slate-200">
              Contraseña
              <input
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-cyan-400"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="al menos 8 caracteres"
                minLength={8}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void handleSignUp()}
                disabled={working !== null || password.length < 8}
                className="rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {working === "signup" ? "Creando…" : "Crear cuenta"}
              </button>
              <button
                type="button"
                onClick={() => void handleSignIn()}
                disabled={working !== null || password.length < 8}
                className="rounded-2xl border border-slate-700 px-4 py-3 font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {working === "signin" ? "Entrando…" : "Ya tengo cuenta"}
              </button>
            </div>
          </div>
        )}

        {message ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
