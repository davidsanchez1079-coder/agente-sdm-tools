"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useIsExterno, useWorkspace } from "@/lib/workspace/context";
import {
  addShare,
  listActiveShares,
  listShareableMembers,
  revokeShare,
  updateSharePermission,
  type CaseSharePermission,
  type CaseShareRow,
  type ShareableMember,
} from "@/lib/cases/shares";
import { listMessages, type MessageRow } from "@/lib/workspace/messages";
import {
  CASE_COLUMNS,
  deleteCase,
  updateCase,
  type CaseRow,
} from "@/lib/workspace/folders";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  agenteFullName,
  listAgentes,
  type AgenteRow,
} from "@/lib/agentes/agentes-db";
import {
  BRANDS,
  ENABLED_AGENT_MODES,
  brandBadgeClass,
  brandBadgeLabel,
  type BrandId,
} from "@/lib/brands/brands";
import {
  CASE_CONVERSION_NIVELES,
  CASE_ESTADOS,
  CASE_OPERACION_TIPOS,
  CASE_PRIORIDADES,
  CASE_RESULTADOS_CIERRE,
  conversionNivelBadge,
  conversionNivelLabel,
  estadoBadge,
  estadoLabel,
  formatPotencialUsd,
  operacionTipoBadge,
  operacionTipoLabel,
  prioridadBadge,
  prioridadLabel,
  resultadoCierreBadge,
  resultadoCierreLabel,
  type CaseConversionNivel,
  type CaseEstado,
  type CaseOperacionTipo,
  type CasePrioridad,
  type CaseResultadoCierre,
} from "@/lib/cases/cases";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { AgentModeSelect } from "./agent-mode-select";
import { CaseAttachments } from "./case-attachments";
import {
  AttachmentPreviewModal,
  type AttachmentPreview,
} from "./attachment-preview-modal";
import { MessageContent } from "./message-content";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
  getSignedUrl,
  listAttachments,
  uploadAttachment,
  type AttachmentRow,
} from "@/lib/workspace/attachments";
import { formatError } from "@/lib/errors/format";

type CaseDetailProps = {
  caseId: string;
};

function deriveAgentMode(marcaPreferida: string | null): BrandId {
  if (!marcaPreferida) return "general";
  const normalized = marcaPreferida.trim().toLowerCase();
  const match = BRANDS.find(
    (brand) =>
      brand.id === normalized || brand.label.toLowerCase() === normalized,
  );
  const derived: BrandId = match?.id ?? "general";
  // En v1 solo "general" está habilitado. Si el caso trae fabricante cuyo
  // modo especialista aún no existe, caemos a general para no auto-seleccionar
  // una opción deshabilitada del dropdown.
  return ENABLED_AGENT_MODES.includes(derived) ? derived : "general";
}

function describeFabricante(marcaPreferida: string | null) {
  if (!marcaPreferida) return "Sin asignar";
  const normalized = marcaPreferida.trim().toLowerCase();
  const match = BRANDS.find(
    (brand) =>
      brand.id === normalized || brand.label.toLowerCase() === normalized,
  );
  return match?.label ?? marcaPreferida;
}

const MESSAGE_TIME_FORMAT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatMessageTime(iso: string): string {
  try {
    return MESSAGE_TIME_FORMAT.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CaseDetail({ caseId }: CaseDetailProps) {
  const router = useRouter();
  const isExterno = useIsExterno();
  const { appUser, workspaceRol } = useWorkspace();
  const [caseItem, setCaseItem] = useState<CaseRow | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingCase, setDeletingCase] = useState(false);
  const [agentes, setAgentes] = useState<AgenteRow[]>([]);
  const [savingSecondary, setSavingSecondary] = useState(false);
  const [savingMarca, setSavingMarca] = useState(false);
  const [savingConversion, setSavingConversion] = useState(false);
  const [shares, setShares] = useState<CaseShareRow[]>([]);
  const [shareableMembers, setShareableMembers] = useState<ShareableMember[]>([]);
  const [shareDraftMember, setShareDraftMember] = useState<string>("");
  const [shareDraftPermission, setShareDraftPermission] = useState<CaseSharePermission>("edit");
  const [addingShare, setAddingShare] = useState(false);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [agentMode, setAgentMode] = useState<BrandId>("general");
  const [message, setMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [resumenDraft, setResumenDraft] = useState("");
  const [siguienteDraft, setSiguienteDraft] = useState("");
  const [potencialDraft, setPotencialDraft] = useState("");
  const [operacionDraft, setOperacionDraft] = useState("");
  const [savingResumen, setSavingResumen] = useState(false);
  const [savingSiguiente, setSavingSiguiente] = useState(false);
  const [savingEstado, setSavingEstado] = useState(false);
  const [savingPrioridad, setSavingPrioridad] = useState(false);
  const [savingResultado, setSavingResultado] = useState(false);
  const [savingRap, setSavingRap] = useState(false);
  const [savingPotencial, setSavingPotencial] = useState(false);
  const [savingOperacionTipo, setSavingOperacionTipo] = useState(false);
  const [savingOperacion, setSavingOperacion] = useState(false);
  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<
    string[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<
    Record<string, string>
  >({});
  const [preview, setPreview] = useState<AttachmentPreview | null>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: caseData, error: caseError } = await supabase
          .from("cases")
          .select(CASE_COLUMNS)
          .eq("id", caseId)
          .maybeSingle<CaseRow>();

        if (cancelled) return;
        if (caseError) throw caseError;
        if (!caseData) {
          setNotFound(true);
          return;
        }
        setCaseItem(caseData);
        setResumenDraft(caseData.resumen_ejecutivo ?? "");
        setSiguienteDraft(caseData.siguiente_accion ?? "");
        setPotencialDraft(
          caseData.potencial_usd != null
            ? String(caseData.potencial_usd)
            : "",
        );
        setOperacionDraft(caseData.operacion ?? "");
        setAgentMode(deriveAgentMode(caseData.marca_preferida));
        setSelectedAttachmentIds([]);

        // Resuelve workspace_id del caso para listar agentes asignables
        // del workspace correcto. Pasa por folders ya que cases.folder_id
        // → folders.workspace_id.
        const [msgs, atts, folderRes] = await Promise.all([
          listMessages(supabase, caseId),
          listAttachments(supabase, caseId),
          supabase
            .from("folders")
            .select("workspace_id")
            .eq("id", caseData.folder_id)
            .maybeSingle<{ workspace_id: string }>(),
        ]);
        if (!cancelled) {
          setMessages(msgs);
          setAttachments(atts);
          if (folderRes.data?.workspace_id) {
            try {
              const list = await listAgentes(
                supabase,
                folderRes.data.workspace_id,
                { onlyActive: true },
              );
              if (!cancelled) setAgentes(list);
            } catch {
              // Silencioso: si falla, el selector queda vacío.
            }
            try {
              const [activeShares, shareables] = await Promise.all([
                listActiveShares(supabase, caseId),
                listShareableMembers(supabase, folderRes.data.workspace_id),
              ]);
              if (!cancelled) {
                setShares(activeShares);
                setShareableMembers(shareables);
              }
            } catch {
              // Silencioso: si falla, no mostramos sharing pero no rompemos el caso.
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            formatError(error, "No se pudo cargar el caso."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const next: Record<string, string> = {};
      for (const row of attachments) {
        if (row.kind !== "image") continue;
        try {
          next[row.id] = await getSignedUrl(supabase, row.storage_path, 3600);
        } catch {
          // si falla una URL, los demás siguen
        }
      }
      if (!cancelled) setAttachmentPreviewUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [attachments]);

  async function openAttachmentPreview(row: AttachmentRow) {
    try {
      const supabase = getSupabaseBrowserClient();
      const url = await getSignedUrl(supabase, row.storage_path, 600);
      setPreview({ row, url });
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo abrir el adjunto."),
      );
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!caseItem) return;
    setUploading(true);
    setUploadError(null);
    const supabase = getSupabaseBrowserClient();
    let current = attachments;
    const newlyUploaded: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setUploadError(
          `"${file.name}" supera los 20 MB. Se omitió. Puedes reducir el tamaño y reintentar.`,
        );
        continue;
      }
      try {
        const row = await uploadAttachment(supabase, caseItem.id, file);
        current = [row, ...current];
        setAttachments(current);
        newlyUploaded.push(row.id);
      } catch (error) {
        setUploadError(formatError(error, `Error al subir "${file.name}".`));
      }
    }
    if (newlyUploaded.length > 0) {
      setSelectedAttachmentIds((prev) => {
        const set = new Set(prev);
        for (const id of newlyUploaded) set.add(id);
        return Array.from(set);
      });
    }
    setUploading(false);
  }

  function toggleSelectAttachment(id: string) {
    setSelectedAttachmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSaveResumen() {
    if (!caseItem) return;
    setSavingResumen(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        resumen_ejecutivo: resumenDraft.trim() || null,
      });
      setCaseItem(updated);
      setMessage("Resumen ejecutivo guardado.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo guardar el resumen."),
      );
    } finally {
      setSavingResumen(false);
    }
  }

  async function handleSaveTitle() {
    if (!caseItem) return;
    const next = titleDraft.trim();
    if (!next) {
      setMessage("El nombre del caso no puede estar vacío.");
      return;
    }
    if (next === caseItem.titulo) {
      setEditTitleOpen(false);
      return;
    }
    setSavingTitle(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        titulo: next,
      });
      setCaseItem(updated);
      setEditTitleOpen(false);
      setMessage("Nombre actualizado.");
    } catch (error) {
      setMessage(formatError(error, "No se pudo actualizar el nombre."));
    } finally {
      setSavingTitle(false);
    }
  }

  async function handleSaveSiguiente() {
    if (!caseItem) return;
    setSavingSiguiente(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        siguiente_accion: siguienteDraft.trim() || null,
      });
      setCaseItem(updated);
      setMessage("Siguiente acción guardada.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo guardar la siguiente acción."),
      );
    } finally {
      setSavingSiguiente(false);
    }
  }

  async function handleChangeEstado(estado: CaseEstado) {
    if (!caseItem || caseItem.estado === estado) return;
    setSavingEstado(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, { estado });
      setCaseItem(updated);
      setMessage("Estado actualizado.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo actualizar el estado."),
      );
    } finally {
      setSavingEstado(false);
    }
  }

  async function handleChangePrioridad(prioridad: CasePrioridad) {
    if (!caseItem || caseItem.prioridad === prioridad) return;
    setSavingPrioridad(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, { prioridad });
      setCaseItem(updated);
      setMessage("Prioridad actualizada.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo actualizar la prioridad."),
      );
    } finally {
      setSavingPrioridad(false);
    }
  }

  async function handleChangeResultado(
    resultado: CaseResultadoCierre | null,
  ) {
    if (!caseItem || caseItem.resultado_cierre === resultado) return;
    setSavingResultado(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        resultado_cierre: resultado,
      });
      setCaseItem(updated);
      setMessage("Resultado de cierre actualizado.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo actualizar el resultado de cierre."),
      );
    } finally {
      setSavingResultado(false);
    }
  }

  async function handleSavePotencial() {
    if (!caseItem) return;
    const raw = potencialDraft.trim().replace(/[,\s]/g, "");
    const parsed = raw === "" ? null : Number(raw);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      setMessage("Valor inválido para potencial. Usa un entero ≥ 0.");
      return;
    }
    setSavingPotencial(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        potencial_usd: parsed === null ? null : Math.trunc(parsed),
      });
      setCaseItem(updated);
      setPotencialDraft(
        updated.potencial_usd != null ? String(updated.potencial_usd) : "",
      );
      setMessage("Potencial USD guardado.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo guardar el potencial."),
      );
    } finally {
      setSavingPotencial(false);
    }
  }

  async function handleChangeOperacionTipo(
    tipo: CaseOperacionTipo | null,
  ) {
    if (!caseItem || (caseItem.operacion_tipo ?? null) === tipo) return;
    setSavingOperacionTipo(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        operacion_tipo: tipo,
      });
      setCaseItem(updated);
      setMessage("Tipo de operación actualizado.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo actualizar el tipo de operación."),
      );
    } finally {
      setSavingOperacionTipo(false);
    }
  }

  async function handleSaveOperacion() {
    if (!caseItem) return;
    const next = operacionDraft.trim();
    const current = caseItem.operacion ?? "";
    if (next === current) return;
    setSavingOperacion(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        operacion: next === "" ? null : next,
      });
      setCaseItem(updated);
      setOperacionDraft(updated.operacion ?? "");
      setMessage("Detalle de operación guardado.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo guardar el detalle de operación."),
      );
    } finally {
      setSavingOperacion(false);
    }
  }

  async function handleChangeConversion(value: CaseConversionNivel) {
    if (!caseItem || caseItem.conversion_nivel === value) return;
    setSavingConversion(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        conversion_nivel: value,
      });
      setCaseItem(updated);
      setMessage("Nivel de conversión actualizado.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo actualizar el nivel de conversión."),
      );
    } finally {
      setSavingConversion(false);
    }
  }

  async function handleChangeMarca(value: string) {
    if (!caseItem) return;
    const next = value.trim();
    if (!next) return;
    if ((caseItem.marca_preferida ?? "") === next) return;
    setSavingMarca(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        marca_preferida: next,
      });
      setCaseItem(updated);
      setAgentMode(deriveAgentMode(updated.marca_preferida));
      setMessage("Fabricante actualizado.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo actualizar el fabricante."),
      );
    } finally {
      setSavingMarca(false);
    }
  }

  async function handleChangeSecondaryAgente(value: string) {
    if (!caseItem) return;
    const next = value || null;
    if ((caseItem.secondary_agente_id ?? null) === next) return;
    setSavingSecondary(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        secondary_agente_id: next,
      });
      setCaseItem(updated);
      setMessage("Agente secundario actualizado.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo actualizar el agente secundario."),
      );
    } finally {
      setSavingSecondary(false);
    }
  }

  async function handleAddShare() {
    if (!caseItem || !shareDraftMember) return;
    const target = shareableMembers.find((m) => m.member_id === shareDraftMember);
    if (!target) return;
    setAddingShare(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const newShare = await addShare(
        supabase,
        caseItem.id,
        target,
        appUser.id,
        shareDraftPermission,
      );
      setShares((prev) => {
        const filtered = prev.filter((s) => s.id !== newShare.id);
        return [newShare, ...filtered];
      });
      setShareDraftMember("");
      setShareDraftPermission("edit");
      setMessage(
        `Caso compartido con ${target.display_name} (${shareDraftPermission === "edit" ? "ver y editar" : "solo ver"}).`,
      );
    } catch (error) {
      setMessage(formatError(error, "No se pudo compartir el caso."));
    } finally {
      setAddingShare(false);
    }
  }

  async function handleUpdateSharePermission(
    shareId: string,
    permission: CaseSharePermission,
  ) {
    setUpdatingShareId(shareId);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateSharePermission(supabase, shareId, permission);
      setShares((prev) => prev.map((s) => (s.id === shareId ? updated : s)));
      setMessage("Permiso actualizado.");
    } catch (error) {
      setMessage(formatError(error, "No se pudo actualizar el permiso."));
    } finally {
      setUpdatingShareId(null);
    }
  }

  async function handleRevokeShare(shareId: string) {
    setRevokingShareId(shareId);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await revokeShare(supabase, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      setMessage("Acceso revocado.");
    } catch (error) {
      setMessage(formatError(error, "No se pudo revocar el acceso."));
    } finally {
      setRevokingShareId(null);
    }
  }

  async function handleConfirmDeleteCase() {
    if (!caseItem) return;
    setDeletingCase(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteCase(supabase, caseItem.id);
      router.push("/app/caso");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo borrar el caso."),
      );
      setDeletingCase(false);
      setConfirmDeleteOpen(false);
    }
  }

  async function handleChangeRap(requiereRap: boolean) {
    if (!caseItem || caseItem.requiere_rap === requiereRap) return;
    setSavingRap(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        requiere_rap: requiereRap,
      });
      setCaseItem(updated);
      setMessage(
        requiereRap
          ? "Marcado como Requiere RAP."
          : "Se quitó la marca Requiere RAP.",
      );
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo actualizar el flag de RAP."),
      );
    } finally {
      setSavingRap(false);
    }
  }

  async function handleSend() {
    if (!caseItem || !chatInput.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const text = chatInput.trim();

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
      }

      const response = await fetch("/api/agent/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          caseId: caseItem.id,
          content: text,
          mode: agentMode,
          attachmentIds: selectedAttachmentIds,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        userMessage?: MessageRow;
        agentMessage?: MessageRow;
        error?: string;
      };

      if (!response.ok) {
        if (payload.userMessage) {
          setMessages((prev) => [...prev, payload.userMessage as MessageRow]);
          setChatInput("");
        }
        throw new Error(payload.error ?? "Error al llamar al agente.");
      }

      if (!payload.userMessage || !payload.agentMessage) {
        throw new Error("Respuesta inválida del servidor.");
      }

      setMessages((prev) => [
        ...prev,
        payload.userMessage as MessageRow,
        payload.agentMessage as MessageRow,
      ]);
      setChatInput("");
      setSelectedAttachmentIds([]);
      setMessage("Mensaje guardado.");
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo enviar el mensaje."),
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Cargando caso…
      </p>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          No encontré ese caso. Puede estar borrado o no tienes acceso.
        </p>
        <Link
          href="/app/caso"
          className="mt-4 inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:bg-emerald-400/10"
        >
          Volver a casos
        </Link>
      </div>
    );
  }

  if (!caseItem) return null;

  const fabricanteLabel = describeFabricante(caseItem.marca_preferida);
  const potencialRaw = potencialDraft.trim().replace(/[,\s]/g, "");
  const potencialNum = potencialRaw === "" ? null : Number(potencialRaw);
  const potencialInvalid =
    potencialRaw !== "" &&
    (Number.isNaN(potencialNum as number) || (potencialNum as number) < 0);
  const potencialDirty =
    !potencialInvalid &&
    (caseItem.potencial_usd ?? null) !==
      (potencialNum === null ? null : Math.trunc(potencialNum as number));
  const resumenDirty =
    (caseItem.resumen_ejecutivo ?? "") !== resumenDraft.trim() &&
    resumenDraft.trim() !== "";
  const resumenErased =
    (caseItem.resumen_ejecutivo ?? "") !== "" && resumenDraft.trim() === "";
  const siguienteDirty =
    (caseItem.siguiente_accion ?? "") !== siguienteDraft.trim() &&
    siguienteDraft.trim() !== "";
  const siguienteErased =
    (caseItem.siguiente_accion ?? "") !== "" && siguienteDraft.trim() === "";
  const operacionDirty =
    (caseItem.operacion ?? "") !== operacionDraft.trim() &&
    operacionDraft.trim() !== "";
  const operacionErased =
    (caseItem.operacion ?? "") !== "" && operacionDraft.trim() === "";

  const controlClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20";

  return (
    <section className="grid min-w-0 gap-6">
      {/* Header con breadcrumb, título y etiquetas rápidas */}
      <div
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.caso}`}
      >
        <Link
          href="/app/caso"
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          ← Volver a casos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.caso}`}
          >
            <ModuleIcon id="caso" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {caseItem.titulo}
          </h2>
          <button
            type="button"
            onClick={() => {
              setTitleDraft(caseItem.titulo);
              setEditTitleOpen(true);
            }}
            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            title="Editar nombre"
            aria-label="Editar nombre del caso"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${MODULE_CHIP.caso}`}
          >
            Caso/Oportunidad
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${estadoBadge(caseItem.estado)}`}
          >
            {estadoLabel(caseItem.estado)}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${prioridadBadge(caseItem.prioridad)}`}
          >
            Prioridad {prioridadLabel(caseItem.prioridad)}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${conversionNivelBadge(caseItem.conversion_nivel)}`}
            title="Nivel de conversión comercial"
          >
            Conversión {conversionNivelLabel(caseItem.conversion_nivel)}
          </span>
          {caseItem.operacion_tipo ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${operacionTipoBadge(caseItem.operacion_tipo)}`}
            >
              {operacionTipoLabel(caseItem.operacion_tipo)}
            </span>
          ) : null}
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${brandBadgeClass(caseItem.marca_preferida)}`}
          >
            {brandBadgeLabel(caseItem.marca_preferida)}
          </span>
          {caseItem.cliente ? (
            <span className="rounded-full border border-cyan-500/40 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200">
              {caseItem.cliente}
            </span>
          ) : null}
          {caseItem.resultado_cierre ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${resultadoCierreBadge(caseItem.resultado_cierre)}`}
            >
              {resultadoCierreLabel(caseItem.resultado_cierre)}
            </span>
          ) : null}
          {caseItem.requiere_rap ? (
            <span className="rounded-full border border-violet-500/40 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-800 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200">
              Requiere RAP
            </span>
          ) : null}
        </div>
      </div>

      {/* Chat — espacio de trabajo primario */}
      {!isExterno ? (
      <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <AgentModeSelect
          value={agentMode}
          onChange={setAgentMode}
          disabled={sending}
        />
        <div className="grid gap-4">
          <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950/60">
            <input
              ref={filePickerRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              multiple
              className="hidden"
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.target.value = "";
              }}
            />

            {selectedAttachmentIds.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800/80 dark:bg-slate-900/40">
                {selectedAttachmentIds.map((id) => {
                  const row = attachments.find((r) => r.id === id);
                  if (!row) return null;
                  const thumb = attachmentPreviewUrls[id];
                  return (
                    <span
                      key={id}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-100 py-1 pl-1 pr-2 text-xs text-emerald-900 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-100"
                    >
                      {row.kind === "image" && thumb ? (
                        <span className="relative block h-6 w-6 overflow-hidden rounded-full border border-emerald-500/40 dark:border-emerald-400/40">
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="24px"
                            className="object-cover"
                            unoptimized
                          />
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-[9px] font-bold uppercase tracking-wider text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-50">
                          {row.kind === "pdf" ? "PDF" : "Arch"}
                        </span>
                      )}
                      <span
                        className="max-w-[14ch] truncate font-medium"
                        title={row.filename}
                      >
                        {row.filename}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSelectAttachment(id)}
                        aria-label={`Quitar ${row.filename} del mensaje`}
                        disabled={sending}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-emerald-800 transition hover:bg-emerald-200 disabled:opacity-50 dark:text-emerald-100 dark:hover:bg-emerald-500/25"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3 w-3"
                          aria-hidden="true"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : null}

            <textarea
              className="w-full resize-none border-0 bg-transparent px-3 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
              rows={5}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder={
                selectedAttachmentIds.length > 0
                  ? "Escribe la instrucción sobre los adjuntos y envía."
                  : "Escribe tu mensaje. Puedes adjuntar foto o PDF abajo."
              }
              disabled={sending}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-800/80 dark:bg-slate-900/40">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  disabled={uploading || sending}
                  aria-label="Tomar foto"
                  title="Tomar foto"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Foto
                </button>
                <button
                  type="button"
                  onClick={() => filePickerRef.current?.click()}
                  disabled={uploading || sending}
                  aria-label="Adjuntar archivo"
                  title="Adjuntar archivo"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  Archivo
                </button>
                {uploading ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Subiendo…
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || uploading || !chatInput.trim()}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-emerald-300"
              >
                {sending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </div>

          {uploadError ? (
            <p className="text-xs text-amber-600 dark:text-amber-300">
              {uploadError}
            </p>
          ) : null}

          <CaseAttachments
            attachments={attachments}
            selectedIds={selectedAttachmentIds}
            previewUrls={attachmentPreviewUrls}
            onToggleSelect={toggleSelectAttachment}
            onChange={(next) => {
              setAttachments(next);
              // Si se borra un adjunto seleccionado, sale del set.
              setSelectedAttachmentIds((prev) =>
                prev.filter((id) => next.some((row) => row.id === id)),
              );
            }}
            onOpen={openAttachmentPreview}
          />
        </div>
      </div>
      ) : null}

      <div className="grid gap-2">
        {messages.length ? (
          [...messages].reverse().map((entry) => (
            <article
              key={entry.id}
              className={`rounded-xl border px-3.5 py-3 shadow-sm dark:shadow-none ${
                entry.author === "user"
                  ? "border-emerald-500/40 bg-emerald-50/80 dark:border-emerald-400/30 dark:bg-emerald-500/5"
                  : "border-cyan-500/40 bg-cyan-50/80 dark:border-cyan-400/30 dark:bg-cyan-500/5"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {entry.author === "agent" ? (
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300"
                      aria-label="Respuesta generada por IA"
                      title="Generado por IA"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3"
                        aria-hidden="true"
                      >
                        <rect x="3" y="8" width="18" height="12" rx="2" />
                        <line x1="12" y1="4" x2="12" y2="8" />
                        <circle cx="12" cy="3" r="1" />
                        <circle cx="9" cy="13" r="1" fill="currentColor" />
                        <circle cx="15" cy="13" r="1" fill="currentColor" />
                        <line x1="9" y1="17" x2="15" y2="17" />
                      </svg>
                    </span>
                  ) : null}
                  <span>
                    {entry.author === "user"
                      ? "Usuario"
                      : `Agente IA · ${entry.mode_used}`}
                  </span>
                </div>
                <time
                  dateTime={entry.created_at}
                  className="text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400"
                >
                  {formatMessageTime(entry.created_at)}
                </time>
              </div>
              <div className="mt-1.5">
                <MessageContent content={entry.content} />
              </div>
              {entry.author === "user" &&
              entry.attachment_ids.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.attachment_ids.map((attId) => {
                    const row = attachments.find((r) => r.id === attId);
                    if (!row) {
                      return (
                        <span
                          key={attId}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400"
                        >
                          Adjunto eliminado
                        </span>
                      );
                    }
                    const thumb = attachmentPreviewUrls[attId];
                    const isImage = row.kind === "image";
                    return (
                      <button
                        key={attId}
                        type="button"
                        onClick={() => void openAttachmentPreview(row)}
                        className="group inline-flex max-w-full items-center gap-2 rounded-lg border border-emerald-500/40 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-400/40 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-emerald-500/10"
                        title={row.filename}
                      >
                        {isImage && thumb ? (
                          <span className="relative block h-10 w-10 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                            <Image
                              src={thumb}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          </span>
                        ) : (
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {row.kind === "pdf" ? "PDF" : "Arch"}
                          </span>
                        )}
                        <span className="max-w-[18ch] truncate">
                          {row.filename}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            Este caso todavía no tiene mensajes.
          </p>
        )}
      </div>

      {/* Ficha operativa — datos del caso para consulta y seguimiento */}
      {!isExterno ? (
      <>
      <div className="flex items-center gap-3 pt-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
          Ficha operativa
        </span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800/80" />
      </div>

      <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Estado
            </span>
            <select
              className={controlClass}
              value={caseItem.estado}
              onChange={(event) =>
                void handleChangeEstado(event.target.value as CaseEstado)
              }
              disabled={savingEstado}
            >
              {CASE_ESTADOS.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Prioridad
            </span>
            <select
              className={controlClass}
              value={caseItem.prioridad}
              onChange={(event) =>
                void handleChangePrioridad(
                  event.target.value as CasePrioridad,
                )
              }
              disabled={savingPrioridad}
            >
              {CASE_PRIORIDADES.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Agente secundario
            </span>
            <select
              className={controlClass}
              value={caseItem.secondary_agente_id ?? ""}
              onChange={(event) =>
                void handleChangeSecondaryAgente(event.target.value)
              }
              disabled={savingSecondary}
            >
              <option value="">Sin asignar</option>
              {agentes.map((agente) => (
                <option key={agente.id} value={agente.id}>
                  {agenteFullName(agente)}
                  {agente.rol_label ? ` — ${agente.rol_label}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Conversión (probabilidad comercial)
            </span>
            <select
              className={controlClass}
              value={caseItem.conversion_nivel}
              onChange={(event) =>
                void handleChangeConversion(
                  event.target.value as CaseConversionNivel,
                )
              }
              disabled={savingConversion}
            >
              {CASE_CONVERSION_NIVELES.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Distinto de Prioridad. Mide qué tan probable es cerrar la venta.
            </span>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Fabricante {!caseItem.marca_preferida ? <span className="text-amber-600 dark:text-amber-300">(obligatorio)</span> : null}
            </span>
            <select
              className={`${controlClass} ${!caseItem.marca_preferida ? "border-amber-400 dark:border-amber-500/60" : ""}`}
              value={caseItem.marca_preferida ?? ""}
              onChange={(event) => void handleChangeMarca(event.target.value)}
              disabled={savingMarca}
              required
            >
              <option value="" disabled>
                — Selecciona fabricante —
              </option>
              {BRANDS.filter((b) => b.id !== "general").map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            {!caseItem.marca_preferida ? (
              <span className="text-xs text-amber-600 dark:text-amber-300">
                Este caso no tiene fabricante. Asignalo para que externos con esa marca puedan verlo.
              </span>
            ) : null}
          </label>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Operación
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tipo cerrado para clasificar el caso. Detalle libre opcional.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Tipo
            </span>
            <select
              className={controlClass}
              value={caseItem.operacion_tipo ?? ""}
              onChange={(event) =>
                void handleChangeOperacionTipo(
                  event.target.value === ""
                    ? null
                    : (event.target.value as CaseOperacionTipo),
                )
              }
              disabled={savingOperacionTipo}
            >
              <option value="">Sin asignar</option>
              {CASE_OPERACION_TIPOS.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Detalle
            </span>
            <input
              className={controlClass}
              value={operacionDraft}
              onChange={(event) => setOperacionDraft(event.target.value)}
              placeholder="Ej. torneado externo de barra Ø20"
              disabled={savingOperacion}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSaveOperacion()}
            disabled={
              savingOperacion || (!operacionDirty && !operacionErased)
            }
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-emerald-300"
          >
            {savingOperacion ? "Guardando…" : "Guardar detalle"}
          </button>
          {operacionDirty || operacionErased ? (
            <span className="text-xs text-amber-600 dark:text-amber-300">
              Sin guardar
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Potencial mensual de la oportunidad (USD)
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            USD/mes que esperas de este caso específico. Distinto del
            potencial total mensual del cliente, que es el agregado de todas
            sus oportunidades.
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
            Registrado: {formatPotencialUsd(caseItem.potencial_usd)}{caseItem.potencial_usd != null ? " / mes" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-slate-400">
              $
            </span>
            <input
              className={`${controlClass} pl-7`}
              type="text"
              inputMode="numeric"
              value={potencialDraft}
              onChange={(event) => setPotencialDraft(event.target.value)}
              placeholder="0"
              disabled={savingPotencial}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSavePotencial()}
            disabled={
              savingPotencial || potencialInvalid || !potencialDirty
            }
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-emerald-300"
          >
            {savingPotencial ? "Guardando…" : "Guardar"}
          </button>
        </div>
        {potencialInvalid ? (
          <span className="text-xs text-rose-600 dark:text-rose-300">
            Ingresa un entero mayor o igual a 0.
          </span>
        ) : potencialDirty ? (
          <span className="text-xs text-amber-600 dark:text-amber-300">
            Sin guardar
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Siguiente acción
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Qué toca hacer después. Corto y concreto.
          </p>
        </div>
        <input
          className={controlClass}
          value={siguienteDraft}
          onChange={(event) => setSiguienteDraft(event.target.value)}
          placeholder="Ej. Confirmar vida del inserto con operador el viernes."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSaveSiguiente()}
            disabled={
              savingSiguiente || (!siguienteDirty && !siguienteErased)
            }
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-emerald-300"
          >
            {savingSiguiente ? "Guardando…" : "Guardar"}
          </button>
          {siguienteDirty || siguienteErased ? (
            <span className="text-xs text-amber-600 dark:text-amber-300">
              Sin guardar
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Resumen ejecutivo
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tres o cuatro líneas con lo esencial del caso.
          </p>
        </div>
        <textarea
          className={`${controlClass} min-h-24`}
          value={resumenDraft}
          onChange={(event) => setResumenDraft(event.target.value)}
          placeholder="Qué pasa, qué se probó y qué se recomienda."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSaveResumen()}
            disabled={savingResumen || (!resumenDirty && !resumenErased)}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-emerald-300"
          >
            {savingResumen ? "Guardando…" : "Guardar"}
          </button>
          {resumenDirty || resumenErased ? (
            <span className="text-xs text-amber-600 dark:text-amber-300">
              Sin guardar
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Cierre formal
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {caseItem.estado === "cerrado"
              ? "Desenlace del caso y bandera de reporte. Puedes dejar los campos sin registrar si no aplican."
              : "Puedes preparar estos datos antes de cerrar el caso. Quedan vinculados al cierre cuando cambies el estado a Cerrado."}
          </p>
        </div>

        <label className="grid gap-1.5 text-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Resultado de cierre
          </span>
          <select
            className={controlClass}
            value={caseItem.resultado_cierre ?? ""}
            onChange={(event) => {
              const raw = event.target.value;
              void handleChangeResultado(
                raw === "" ? null : (raw as CaseResultadoCierre),
              );
            }}
            disabled={savingResultado}
          >
            <option value="">No registrado</option>
            {CASE_RESULTADOS_CIERRE.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-violet-500/40 dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:border-violet-400/40">
          <input
            type="checkbox"
            checked={caseItem.requiere_rap}
            onChange={(event) => void handleChangeRap(event.target.checked)}
            disabled={savingRap}
            className="mt-0.5 h-4 w-4 rounded border-slate-400 text-violet-600 focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-violet-400"
          />
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-900 dark:text-white">
              Requiere RAP
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              Marca si el caso requiere Reporte de Ahorros y Productividad.
              Opcional; se puede activar en cualquier momento y revisar al
              cierre.
            </span>
          </div>
        </label>
      </div>

      {caseItem.requiere_rap ? (
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-violet-50/60 p-5 shadow-sm dark:border-violet-400/30 dark:bg-violet-500/5 dark:shadow-none before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-violet-500 dark:before:bg-violet-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-violet-500/40 bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-800 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200">
              Reporte de Ahorros y Productividad
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Próximamente
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-800 dark:text-slate-200">
            Este caso está marcado como Requiere RAP. Aquí vivirá la
            sección específica para capturar los datos del reporte formal
            cuando el módulo se construya.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
            Por ahora solo está el flag. Esta área queda reservada para los
            campos del RAP (mediciones, indicadores, comparativos y
            entrega) en una ronda posterior.
          </p>
        </div>
      ) : null}

      <section className="grid gap-3">
        <header>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Contexto técnico
          </h3>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoTile label="Fabricante" value={fabricanteLabel} />
          <InfoTile
            label="Cliente"
            value={caseItem.cliente ?? "Sin asignar"}
          />
          <InfoTile
            label="Operación"
            value={
              [
                caseItem.operacion_tipo
                  ? operacionTipoLabel(caseItem.operacion_tipo)
                  : null,
                caseItem.operacion,
              ]
                .filter(Boolean)
                .join(" — ") || "Sin asignar"
            }
          />
          <InfoTile
            label="Material"
            value={caseItem.material ?? "Sin asignar"}
          />
          <InfoTile
            label="Máquina"
            value={caseItem.maquina ?? "Sin asignar"}
          />
        </div>
      </section>

      {(workspaceRol === "gerente" || (workspaceRol === "interno" && caseItem.created_by === appUser.id)) ? (
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Colaboradores
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Miembros del workspace con acceso explícito a este caso. El permiso (solo ver / ver y editar) se aplica sobre lo que ya permite su rol.
          </p>
        </div>

        {shares.length > 0 ? (
          <div className="grid gap-1.5">
            {shares.map((s) => {
              const member = shareableMembers.find((m) => m.member_id === s.shared_with_member_id);
              const label = member?.display_name ?? s.shared_with_email;
              const isUpdating = updatingShareId === s.id;
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800/80 dark:bg-slate-900/60"
                >
                  <div className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-200">
                    {label}
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      {s.shared_with_email}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      value={s.permission}
                      onChange={(event) =>
                        void handleUpdateSharePermission(
                          s.id,
                          event.target.value as CaseSharePermission,
                        )
                      }
                      disabled={isUpdating || revokingShareId === s.id}
                    >
                      <option value="view">Solo ver</option>
                      <option value="edit">Ver y editar</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleRevokeShare(s.id)}
                      disabled={revokingShareId === s.id || isUpdating}
                      className="shrink-0 rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                      {revokingShareId === s.id ? "Revocando…" : "Revocar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aún no se ha compartido este caso con nadie.
          </p>
        )}

        <div className="grid gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-3 dark:border-slate-700 dark:bg-slate-900/30">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Compartir con un miembro del workspace
          </span>
          <select
            className={controlClass}
            value={shareDraftMember}
            onChange={(event) => setShareDraftMember(event.target.value)}
            disabled={addingShare}
          >
            <option value="">— Selecciona miembro —</option>
            {shareableMembers
              .filter(
                (m) =>
                  !shares.some((s) => s.shared_with_member_id === m.member_id),
              )
              .map((m) => (
                <option key={m.member_id} value={m.member_id}>
                  {m.display_name} ({m.rol === "gerente" ? "Gerente" : m.rol === "interno" ? "Interno" : "Externo"}) — {m.email}
                </option>
              ))}
          </select>
          <fieldset className="flex flex-wrap items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
            <legend className="sr-only">Nivel de permiso</legend>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="share-permission"
                value="view"
                checked={shareDraftPermission === "view"}
                onChange={() => setShareDraftPermission("view")}
                disabled={addingShare}
              />
              Solo ver
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="share-permission"
                value="edit"
                checked={shareDraftPermission === "edit"}
                onChange={() => setShareDraftPermission("edit")}
                disabled={addingShare}
              />
              Ver y editar
            </label>
          </fieldset>
          <button
            type="button"
            onClick={() => void handleAddShare()}
            disabled={addingShare || !shareDraftMember}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
          >
            {addingShare ? "Compartiendo…" : "Compartir"}
          </button>
          {shareableMembers.length === 0 ? (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              No hay miembros activos en el workspace todavía.
            </span>
          ) : null}
        </div>
      </div>
      ) : null}

      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 dark:border-rose-500/30 dark:bg-rose-500/5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-700 dark:text-rose-300">
          Eliminar caso
        </p>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Borra el caso, sus mensajes con el agente y los adjuntos. No se
          puede deshacer.
        </p>
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={deletingCase}
          className="mt-3 rounded-xl border border-rose-400 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-rose-500/10"
        >
          Borrar caso
        </button>
      </div>
      </>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
          {message}
        </div>
      ) : null}

      <AttachmentPreviewModal
        preview={preview}
        onClose={() => setPreview(null)}
      />

      {editTitleOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title-dialog-title"
          onClick={(event) => {
            if (event.target === event.currentTarget && !savingTitle) {
              setEditTitleOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800/80 dark:bg-slate-900">
            <h3
              id="edit-title-dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Editar nombre del caso
            </h3>
            <label
              htmlFor="edit-title-input"
              className="mt-4 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400"
            >
              Nombre
            </label>
            <input
              id="edit-title-input"
              type="text"
              autoFocus
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !savingTitle) {
                  event.preventDefault();
                  void handleSaveTitle();
                } else if (event.key === "Escape" && !savingTitle) {
                  setEditTitleOpen(false);
                }
              }}
              disabled={savingTitle}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
            />
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditTitleOpen(false)}
                disabled={savingTitle}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveTitle()}
                disabled={savingTitle || !titleDraft.trim()}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
              >
                {savingTitle ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`¿Borrar el caso «${caseItem.titulo}»?`}
        description="Se eliminan también los mensajes con el agente y los adjuntos. No se puede deshacer."
        confirmLabel="Borrar caso"
        tone="destructive"
        busy={deletingCase}
        onConfirm={handleConfirmDeleteCase}
        onClose={() => {
          if (!deletingCase) setConfirmDeleteOpen(false);
        }}
      />
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
