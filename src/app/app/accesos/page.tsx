"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useIsExterno, useWorkspace } from "@/lib/workspace/context";
import { NoAccess } from "@/components/layout/no-access";
import {
  countActiveGerentes,
  createInvitation,
  deleteMember,
  getMemberBrandsBatch,
  listMembers,
  memberStatus,
  regenerateInvitationToken,
  sendInvitationEmail,
  setMemberBrands as apiSetMemberBrands,
  updateMemberActivo,
  updateMemberRol,
  type WorkspaceMemberRol,
  type WorkspaceMemberRow,
} from "@/lib/permisos/permisos-db";
import { BRANDS } from "@/lib/brands/brands";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { formatError } from "@/lib/errors/format";

const ROL_LABEL: Record<WorkspaceMemberRol, string> = {
  gerente: "Gerente",
  interno: "Interno",
  externo: "Externo",
};

const ROL_BADGE: Record<WorkspaceMemberRol, string> = {
  gerente:
    "border-indigo-500/40 bg-indigo-100 text-indigo-800 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200",
  interno:
    "border-cyan-500/40 bg-cyan-100 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200",
  externo:
    "border-amber-500/40 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200",
};

const FECHA_FMT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return FECHA_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

function brandLabel(brandId: string): string {
  return BRANDS.find((b) => b.id === brandId)?.label ?? brandId;
}

const ASIGNABLES = BRANDS.filter((b) => b.id !== "general" && b.id !== "otro");

type PendingAction =
  | { kind: "delete"; member: WorkspaceMemberRow }
  | { kind: "deactivate"; member: WorkspaceMemberRow }
  | { kind: "activate"; member: WorkspaceMemberRow }
  | {
      kind: "rol";
      member: WorkspaceMemberRow;
      newRol: WorkspaceMemberRol;
    }
  | null;

export default function AccesosPage() {
  const isExterno = useIsExterno();
  const { workspaceId } = useWorkspace();
  if (isExterno) return <NoAccess titulo="Accesos" />;
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [memberBrands, setMemberBrands] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRol, setInvRol] = useState<WorkspaceMemberRol>("interno");
  const [invBrands, setInvBrands] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<{
    memberId: string;
    link: string;
    email: string;
  } | null>(null);
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  const [editingBrandsFor, setEditingBrandsFor] = useState<string | null>(null);
  const [editBrands, setEditBrands] = useState<string[]>([]);
  const [savingBrands, setSavingBrands] = useState(false);

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionBlocked, setActionBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string>("");

  async function reload() {
    const supabase = getSupabaseBrowserClient();
    const list = await listMembers(supabase, workspaceId);
    setMembers(list);
    const externoIds = list
      .filter((m) => m.rol === "externo")
      .map((m) => m.id);
    if (externoIds.length > 0) {
      const brands = await getMemberBrandsBatch(supabase, externoIds);
      setMemberBrands(brands);
    } else {
      setMemberBrands({});
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!cancelled) setCurrentEmail(userData.user?.email ?? null);
        await reload();
      } catch (error) {
        if (!cancelled) {
          setMessage(
            formatError(error, "No se pudo cargar el catálogo de accesos."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function handleInvite() {
    const trimmed = invEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (invRol === "externo" && invBrands.length === 0) {
      setMessage("Asigna al menos una marca al externo antes de invitar.");
      return;
    }
    setInviting(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const created = await createInvitation(supabase, workspaceId, {
        email: trimmed,
        rol: invRol,
        brandIds: invRol === "externo" ? invBrands : [],
      });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const link = `${origin}/invitacion/${created.invitation_token}`;
      setLastInviteLink({ memberId: created.id, link, email: created.email });
      setInvEmail("");
      setInvRol("interno");
      setInvBrands([]);
      setShowInviteForm(false);
      await reload();

      // Intento de envío automático del correo. Si falla, la invitación
      // existe en BD y el banner del link copiable arriba sirve como
      // fallback manual.
      try {
        const result = await sendInvitationEmail(supabase, created.id);
        setMessage(`Invitación enviada por correo a ${result.to}.`);
      } catch (sendError) {
        setMessage(
          `Invitación creada, pero no se pudo mandar el correo automático: ${
            sendError instanceof Error ? sendError.message : "error desconocido"
          }. Copia el link manual y compártelo.`,
        );
      }
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code: string }).code
          : "";
      const msg =
        code === "23505"
          ? "Ya existe una persona con ese correo en este workspace."
          : formatError(error, "No se pudo crear la invitación.");
      setMessage(msg);
    } finally {
      setInviting(false);
    }
  }

  async function handleRegenerate(member: WorkspaceMemberRow) {
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await regenerateInvitationToken(supabase, member.id);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const link = `${origin}/invitacion/${updated.invitation_token}`;
      setLastInviteLink({ memberId: updated.id, link, email: updated.email });
      await reload();
      try {
        const result = await sendInvitationEmail(supabase, updated.id);
        setMessage(
          `Link regenerado y correo enviado a ${result.to} con el nuevo token.`,
        );
      } catch (sendError) {
        setMessage(
          `Link regenerado, pero no se pudo mandar el correo: ${
            sendError instanceof Error ? sendError.message : "error desconocido"
          }. Copia el link manual.`,
        );
      }
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo regenerar el link."),
      );
    }
  }

  async function handleResend(member: WorkspaceMemberRow) {
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const result = await sendInvitationEmail(supabase, member.id);
      setMessage(`Correo reenviado a ${result.to}.`);
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo reenviar el correo."),
      );
    }
  }

  async function handleCopyLink(memberId: string, link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedFor(memberId);
      setTimeout(() => setCopiedFor(null), 2000);
    } catch {
      setMessage("No se pudo copiar al portapapeles.");
    }
  }

  function startEditBrands(member: WorkspaceMemberRow) {
    setEditingBrandsFor(member.id);
    setEditBrands(memberBrands[member.id] ?? []);
  }

  async function handleSaveBrands() {
    if (!editingBrandsFor) return;
    setSavingBrands(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await apiSetMemberBrands(supabase, editingBrandsFor, editBrands);
      await reload();
      setEditingBrandsFor(null);
      setMessage("Marcas actualizadas.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudieron guardar las marcas."),
      );
    } finally {
      setSavingBrands(false);
    }
  }

  // Solicita una acción destructiva. Antes de abrir el dialog, valida
  // la regla "no quitarse al último gerente" para acciones que aplican.
  async function requestAction(action: PendingAction) {
    if (!action) return;
    setActionBlocked(false);
    setBlockedReason("");

    const isLastGerenteCheck =
      action.member.rol === "gerente" &&
      memberStatus(action.member) === "activo" &&
      (action.kind === "delete" ||
        action.kind === "deactivate" ||
        (action.kind === "rol" && action.newRol !== "gerente"));

    if (isLastGerenteCheck) {
      try {
        const supabase = getSupabaseBrowserClient();
        const count = await countActiveGerentes(supabase, workspaceId);
        if (count <= 1) {
          setActionBlocked(true);
          setBlockedReason(
            "Es el último gerente activo del workspace. Asigna otro gerente antes de aplicar este cambio.",
          );
        }
      } catch {
        // si falla el conteo, seguimos sin bloquear y la BD igual te
        // protege con error si el conteo realmente está en 0
      }
    }

    setPendingAction(action);
  }

  async function confirmAction() {
    if (!pendingAction || actionBlocked) return;
    setActionBusy(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      switch (pendingAction.kind) {
        case "delete":
          await deleteMember(supabase, pendingAction.member.id);
          setMessage("Miembro eliminado.");
          break;
        case "deactivate":
          await updateMemberActivo(supabase, pendingAction.member.id, false);
          setMessage("Acceso desactivado.");
          break;
        case "activate":
          await updateMemberActivo(supabase, pendingAction.member.id, true);
          setMessage("Acceso reactivado.");
          break;
        case "rol":
          await updateMemberRol(
            supabase,
            pendingAction.member.id,
            pendingAction.newRol,
          );
          setMessage("Rol actualizado.");
          break;
      }
      await reload();
      setPendingAction(null);
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo aplicar la acción."),
      );
    } finally {
      setActionBusy(false);
    }
  }

  function describeAction(action: NonNullable<PendingAction>): {
    title: string;
    description: string;
    confirmLabel: string;
  } {
    const who = action.member.email;
    switch (action.kind) {
      case "delete":
        return {
          title: `¿Eliminar a «${who}»?`,
          description:
            "Esta acción borra el registro de membresía. Si la persona tenía sesión activa, dejará de ver este workspace al refrescar.",
          confirmLabel: "Eliminar",
        };
      case "deactivate":
        return {
          title: `¿Desactivar acceso de «${who}»?`,
          description:
            "Pierde acceso al workspace, pero el registro queda como inactivo (puedes reactivar después). Sus casos creados siguen vivos.",
          confirmLabel: "Desactivar",
        };
      case "activate":
        return {
          title: `¿Reactivar a «${who}»?`,
          description:
            "Recupera acceso al workspace con su rol previo y, si era externo, sus marcas asignadas.",
          confirmLabel: "Reactivar",
        };
      case "rol":
        return {
          title: `¿Cambiar rol de «${who}» a ${ROL_LABEL[action.newRol]}?`,
          description:
            action.newRol === "externo"
              ? "Como externo solo verá casos de las marcas asignadas. Asígnaselas después en su tarjeta si aún no tiene."
              : action.newRol === "interno"
                ? "Como interno solo verá los casos que él creó y los que se le compartan explícitamente."
                : "Como gerente verá todo el workspace y podrá administrar accesos.",
          confirmLabel: "Cambiar rol",
        };
    }
  }

  const grouped = {
    pendientes: members.filter((m) => memberStatus(m) === "pendiente"),
    activos: members.filter((m) => memberStatus(m) === "activo"),
    inactivos: members.filter((m) => memberStatus(m) === "inactivo"),
  };

  const controlClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20";

  return (
    <section className="grid gap-6">
      <header
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.accesos}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.accesos}`}
          >
            <ModuleIcon id="accesos" />
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.accesos}`}
          >
            Accesos
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Personas autorizadas
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Invita por correo, cambia roles, asigna marcas a externos y
          desactiva o elimina accesos. La visibilidad de cases por rol
          entra en vigor cuando se aplique el cambio de RLS (siguiente
          entrega).
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Invitar persona
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              El sistema genera un link copiable para que se lo mandes
              manualmente. Email automático llega después.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInviteForm((v) => !v)}
            className="rounded-xl border border-indigo-500/60 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 dark:border-indigo-400/50 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-400/10"
          >
            {showInviteForm ? "Cancelar" : "+ Invitar persona"}
          </button>
        </div>
        {showInviteForm ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Correo
              </span>
              <input
                className={controlClass}
                type="email"
                value={invEmail}
                onChange={(e) => setInvEmail(e.target.value)}
                placeholder="persona@empresa.com"
                disabled={inviting}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Rol
              </span>
              <select
                className={controlClass}
                value={invRol}
                onChange={(e) => {
                  const next = e.target.value as WorkspaceMemberRol;
                  setInvRol(next);
                  if (next !== "externo") setInvBrands([]);
                }}
                disabled={inviting}
              >
                <option value="gerente">Gerente — ve todo, administra</option>
                <option value="interno">
                  Interno — sus casos + lo compartido
                </option>
                <option value="externo">
                  Externo — solo cases de marcas asignadas
                </option>
              </select>
            </label>
            {invRol === "externo" ? (
              <fieldset className="grid gap-1.5 text-sm sm:col-span-2">
                <legend className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Marcas asignadas (al menos una)
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ASIGNABLES.map((b) => (
                    <label
                      key={b.id}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                        invBrands.includes(b.id)
                          ? "border-amber-500/50 bg-amber-100 text-amber-800 dark:border-amber-400/50 dark:bg-amber-500/20 dark:text-amber-100"
                          : "border-slate-300 bg-white text-slate-700 hover:border-amber-500/40 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={invBrands.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInvBrands((prev) => [...prev, b.id]);
                          } else {
                            setInvBrands((prev) =>
                              prev.filter((x) => x !== b.id),
                            );
                          }
                        }}
                        disabled={inviting}
                      />
                      <span>{b.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => void handleInvite()}
                disabled={inviting || !invEmail.trim()}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-400 dark:text-slate-950 dark:hover:bg-indigo-300"
              >
                {inviting ? "Creando…" : "Crear invitación y generar link"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {lastInviteLink ? (
        <div className="rounded-2xl border border-indigo-500/40 bg-indigo-50/60 p-4 dark:border-indigo-400/40 dark:bg-indigo-500/10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-200">
            Link de invitación para {lastInviteLink.email}
          </p>
          <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100">
            {lastInviteLink.link}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void handleCopyLink(lastInviteLink.memberId, lastInviteLink.link)
              }
              className="rounded-xl border border-indigo-500 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-400/60 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-400/10"
            >
              {copiedFor === lastInviteLink.memberId ? "Copiado!" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={() => setLastInviteLink(null)}
              className="text-xs text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Ocultar
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando catálogo…
        </p>
      ) : (
        <>
          <SectionGroup
            title="Invitaciones pendientes"
            count={grouped.pendientes.length}
            emptyText="Sin invitaciones pendientes."
          >
            {grouped.pendientes.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                brands={memberBrands[m.id] ?? []}
                isMe={m.email.toLowerCase() === currentEmail?.toLowerCase()}
                editingBrandsFor={editingBrandsFor}
                editBrands={editBrands}
                savingBrands={savingBrands}
                onStartEditBrands={() => startEditBrands(m)}
                onCancelEditBrands={() => setEditingBrandsFor(null)}
                onToggleEditBrand={(brandId, on) =>
                  setEditBrands((prev) =>
                    on ? [...prev, brandId] : prev.filter((x) => x !== brandId),
                  )
                }
                onSaveBrands={() => void handleSaveBrands()}
                onRolChange={(rol) =>
                  void requestAction({ kind: "rol", member: m, newRol: rol })
                }
                onActivate={() =>
                  void requestAction({ kind: "activate", member: m })
                }
                onDeactivate={() =>
                  void requestAction({ kind: "deactivate", member: m })
                }
                onDelete={() =>
                  void requestAction({ kind: "delete", member: m })
                }
                onRegenerate={() => void handleRegenerate(m)}
                onResend={() => void handleResend(m)}
              />
            ))}
          </SectionGroup>

          <SectionGroup
            title="Activos"
            count={grouped.activos.length}
            emptyText="Aún no hay personas activas."
          >
            {grouped.activos.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                brands={memberBrands[m.id] ?? []}
                isMe={m.email.toLowerCase() === currentEmail?.toLowerCase()}
                editingBrandsFor={editingBrandsFor}
                editBrands={editBrands}
                savingBrands={savingBrands}
                onStartEditBrands={() => startEditBrands(m)}
                onCancelEditBrands={() => setEditingBrandsFor(null)}
                onToggleEditBrand={(brandId, on) =>
                  setEditBrands((prev) =>
                    on ? [...prev, brandId] : prev.filter((x) => x !== brandId),
                  )
                }
                onSaveBrands={() => void handleSaveBrands()}
                onRolChange={(rol) =>
                  void requestAction({ kind: "rol", member: m, newRol: rol })
                }
                onActivate={() =>
                  void requestAction({ kind: "activate", member: m })
                }
                onDeactivate={() =>
                  void requestAction({ kind: "deactivate", member: m })
                }
                onDelete={() =>
                  void requestAction({ kind: "delete", member: m })
                }
              />
            ))}
          </SectionGroup>

          {grouped.inactivos.length > 0 ? (
            <SectionGroup
              title="Inactivos"
              count={grouped.inactivos.length}
              emptyText=""
            >
              {grouped.inactivos.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  brands={memberBrands[m.id] ?? []}
                  isMe={m.email.toLowerCase() === currentEmail?.toLowerCase()}
                  editingBrandsFor={editingBrandsFor}
                  editBrands={editBrands}
                  savingBrands={savingBrands}
                  onStartEditBrands={() => startEditBrands(m)}
                  onCancelEditBrands={() => setEditingBrandsFor(null)}
                  onToggleEditBrand={(brandId, on) =>
                    setEditBrands((prev) =>
                      on ? [...prev, brandId] : prev.filter((x) => x !== brandId),
                    )
                  }
                  onSaveBrands={() => void handleSaveBrands()}
                  onRolChange={(rol) =>
                    void requestAction({ kind: "rol", member: m, newRol: rol })
                  }
                  onActivate={() =>
                    void requestAction({ kind: "activate", member: m })
                  }
                  onDeactivate={() =>
                    void requestAction({ kind: "deactivate", member: m })
                  }
                  onDelete={() =>
                    void requestAction({ kind: "delete", member: m })
                  }
                />
              ))}
            </SectionGroup>
          ) : null}
        </>
      )}

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
          {message}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction ? describeAction(pendingAction).title : ""}
        description={
          actionBlocked
            ? blockedReason
            : pendingAction
              ? describeAction(pendingAction).description
              : ""
        }
        confirmLabel={
          pendingAction ? describeAction(pendingAction).confirmLabel : ""
        }
        tone={
          pendingAction?.kind === "activate" ||
          (pendingAction?.kind === "rol" && pendingAction.newRol === "gerente")
            ? "neutral"
            : "destructive"
        }
        blocked={actionBlocked}
        busy={actionBusy}
        onConfirm={confirmAction}
        onClose={() => {
          if (!actionBusy) {
            setPendingAction(null);
            setActionBlocked(false);
            setBlockedReason("");
          }
        }}
      />
    </section>
  );
}

function SectionGroup({
  title,
  count,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {count} {count === 1 ? "persona" : "personas"}
        </p>
      </header>
      {count === 0 ? (
        emptyText ? (
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            {emptyText}
          </p>
        ) : null
      ) : (
        <div className="grid gap-2">{children}</div>
      )}
    </section>
  );
}

type MemberCardProps = {
  member: WorkspaceMemberRow;
  brands: string[];
  isMe: boolean;
  editingBrandsFor: string | null;
  editBrands: string[];
  savingBrands: boolean;
  onStartEditBrands: () => void;
  onCancelEditBrands: () => void;
  onToggleEditBrand: (brandId: string, on: boolean) => void;
  onSaveBrands: () => void;
  onRolChange: (rol: WorkspaceMemberRol) => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onRegenerate?: () => void;
  onResend?: () => void;
};

function MemberCard(props: MemberCardProps) {
  const {
    member,
    brands,
    isMe,
    editingBrandsFor,
    editBrands,
    savingBrands,
    onStartEditBrands,
    onCancelEditBrands,
    onToggleEditBrand,
    onSaveBrands,
    onRolChange,
    onActivate,
    onDeactivate,
    onDelete,
    onRegenerate,
    onResend,
  } = props;
  const status = memberStatus(member);
  const editingBrands = editingBrandsFor === member.id;

  const subtitleParts: string[] = [];
  if (status === "pendiente") {
    subtitleParts.push(`Invitado el ${formatDate(member.invited_at)}`);
    if (member.invitation_expires_at)
      subtitleParts.push(`expira ${formatDate(member.invitation_expires_at)}`);
  } else if (status === "activo") {
    subtitleParts.push(`Activo desde ${formatDate(member.joined_at)}`);
  } else {
    subtitleParts.push("Acceso desactivado");
  }
  if (isMe) subtitleParts.push("(tú)");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {member.email}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {subtitleParts.join(" · ")}
          </p>
        </div>
        {isMe ? (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${ROL_BADGE[member.rol]}`}
          >
            {ROL_LABEL[member.rol]}
          </span>
        ) : (
          <select
            value={member.rol}
            onChange={(e) =>
              onRolChange(e.target.value as WorkspaceMemberRol)
            }
            className="shrink-0 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
          >
            <option value="gerente">Gerente</option>
            <option value="interno">Interno</option>
            <option value="externo">Externo</option>
          </select>
        )}
      </div>

      {member.rol === "externo" ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Marcas
          </span>
          {editingBrands ? (
            <>
              {ASIGNABLES.map((b) => (
                <label
                  key={b.id}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
                    editBrands.includes(b.id)
                      ? "border-amber-500/50 bg-amber-100 text-amber-800 dark:border-amber-400/50 dark:bg-amber-500/20 dark:text-amber-100"
                      : "border-slate-300 bg-white text-slate-700 hover:border-amber-500/40 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={editBrands.includes(b.id)}
                    onChange={(e) => onToggleEditBrand(b.id, e.target.checked)}
                    disabled={savingBrands}
                  />
                  <span>{b.label}</span>
                </label>
              ))}
              <button
                type="button"
                onClick={onSaveBrands}
                disabled={savingBrands || editBrands.length === 0}
                className="ml-1 rounded-lg bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingBrands ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={onCancelEditBrands}
                disabled={savingBrands}
                className="text-[11px] text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {brands.length === 0 ? (
                <span className="text-[11px] text-rose-600 dark:text-rose-300">
                  Sin marcas asignadas
                </span>
              ) : (
                brands.map((id) => (
                  <span
                    key={id}
                    className="rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200"
                  >
                    {brandLabel(id)}
                  </span>
                ))
              )}
              {!isMe ? (
                <button
                  type="button"
                  onClick={onStartEditBrands}
                  className="text-[11px] text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  Editar
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
        {status === "pendiente" && onResend ? (
          <button
            type="button"
            onClick={onResend}
            className="rounded-lg border border-indigo-500/60 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-400/60 dark:text-indigo-200 dark:hover:bg-indigo-400/10"
          >
            Reenviar correo
          </button>
        ) : null}
        {status === "pendiente" && onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-400/60 dark:hover:bg-indigo-400/10 dark:hover:text-indigo-200"
          >
            Regenerar link
          </button>
        ) : null}
        {!isMe && status === "activo" ? (
          <button
            type="button"
            onClick={onDeactivate}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-amber-500 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-amber-400/60 dark:hover:bg-amber-400/10 dark:hover:text-amber-200"
          >
            Desactivar
          </button>
        ) : null}
        {!isMe && status === "inactivo" ? (
          <button
            type="button"
            onClick={onActivate}
            className="rounded-lg border border-emerald-500/60 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-400/60 dark:text-emerald-200 dark:hover:bg-emerald-400/10"
          >
            Reactivar
          </button>
        ) : null}
        {!isMe ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            Eliminar
          </button>
        ) : null}
        {isMe ? (
          <span className="text-[11px] italic text-slate-500 dark:text-slate-400">
            Acciones sobre tu propia membresía deshabilitadas para evitar
            autodaño.
          </span>
        ) : null}
      </div>
    </div>
  );
}
