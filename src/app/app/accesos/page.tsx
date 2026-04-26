"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace/context";
import {
  getMemberBrandsBatch,
  listMembers,
  memberStatus,
  type WorkspaceMemberRol,
  type WorkspaceMemberRow,
} from "@/lib/permisos/permisos-db";
import { BRANDS } from "@/lib/brands/brands";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";

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

const STATUS_LABEL_DATE = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return STATUS_LABEL_DATE.format(new Date(iso));
  } catch {
    return iso;
  }
}

function brandLabel(brandId: string): string {
  const b = BRANDS.find((row) => row.id === brandId);
  return b?.label ?? brandId;
}

export default function AccesosPage() {
  const { workspaceId } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [memberBrands, setMemberBrands] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const list = await listMembers(supabase, workspaceId);
        if (cancelled) return;
        setMembers(list);
        const externoIds = list
          .filter((m) => m.rol === "externo")
          .map((m) => m.id);
        if (externoIds.length > 0) {
          const brands = await getMemberBrandsBatch(supabase, externoIds);
          if (!cancelled) setMemberBrands(brands);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el catálogo de accesos.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const grouped = {
    pendientes: members.filter((m) => memberStatus(m) === "pendiente"),
    activos: members.filter((m) => memberStatus(m) === "activo"),
    inactivos: members.filter((m) => memberStatus(m) === "inactivo"),
  };

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
          Quién está dentro de este workspace, con qué rol y qué información
          ve. Esta vista es solo lectura por ahora — invitaciones, cambios
          de rol y revocaciones llegan en la siguiente entrega.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando catálogo…
        </p>
      ) : (
        <>
          <Section
            title="Invitaciones pendientes"
            count={grouped.pendientes.length}
            emptyText="Sin invitaciones pendientes."
          >
            {grouped.pendientes.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                brands={memberBrands[m.id] ?? []}
              />
            ))}
          </Section>

          <Section
            title="Activos"
            count={grouped.activos.length}
            emptyText="Aún no hay personas activas."
          >
            {grouped.activos.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                brands={memberBrands[m.id] ?? []}
              />
            ))}
          </Section>

          {grouped.inactivos.length > 0 ? (
            <Section
              title="Inactivos"
              count={grouped.inactivos.length}
              emptyText=""
            >
              {grouped.inactivos.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  brands={memberBrands[m.id] ?? []}
                />
              ))}
            </Section>
          ) : null}
        </>
      )}

      {message ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {message}
        </div>
      ) : null}
    </section>
  );
}

function Section({
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

function MemberCard({
  member,
  brands,
}: {
  member: WorkspaceMemberRow;
  brands: string[];
}) {
  const status = memberStatus(member);
  const subtitleParts: string[] = [];
  if (status === "pendiente") {
    subtitleParts.push(`Invitado el ${formatDate(member.invited_at)}`);
    if (member.invitation_expires_at) {
      subtitleParts.push(`expira ${formatDate(member.invitation_expires_at)}`);
    }
  } else if (status === "activo") {
    subtitleParts.push(`Activo desde ${formatDate(member.joined_at)}`);
  } else {
    subtitleParts.push("Acceso desactivado");
  }

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
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${ROL_BADGE[member.rol]}`}
        >
          {ROL_LABEL[member.rol]}
        </span>
      </div>
      {member.rol === "externo" && brands.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Marcas
          </span>
          {brands.map((id) => (
            <span
              key={id}
              className="rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200"
            >
              {brandLabel(id)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
