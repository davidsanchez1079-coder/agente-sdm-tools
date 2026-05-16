"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  fetchLatestNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/client";
import { notificationKindLabel } from "@/lib/notifications/labels";
import type { NotificationRow } from "@/lib/notifications/types";

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function NotificationsDrawer({
  open,
  onClose,
  onUnreadChanged,
}: {
  open: boolean;
  onClose: () => void;
  onUnreadChanged?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read_at).length,
    [items],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLatestNotifications(30)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "No se pudieron cargar las notificaciones.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setItems((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
      );
      onUnreadChanged?.();
    } catch (e: any) {
      setError(e?.message ?? "No se pudieron marcar como leídas.");
    }
  }

  async function handleItemClick(item: NotificationRow) {
    if (!item.read_at) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) =>
          prev.map((n) =>
            n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n,
          ),
        );
        onUnreadChanged?.();
      } catch {
        // Si falla el mark-read, igual dejamos navegar.
      }
    }
    onClose();
  }

  if (!open || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Cerrar notificaciones"
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <section className="absolute left-1/2 top-3 w-[min(92vw,420px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:left-auto sm:right-3 sm:translate-x-0 dark:border-slate-800/80 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800/80">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Notificaciones
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
              {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-400/60 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
            >
              Marcar todo leído
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-200"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto p-2">
          {loading ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
              Cargando…
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-rose-600 dark:text-rose-300">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
              No hay notificaciones todavía.
            </div>
          ) : (
            <ul className="grid gap-2">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => void handleItemClick(n)}
                    className={`block rounded-2xl border px-3 py-3 transition ${
                      n.read_at
                        ? "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800/70 dark:bg-slate-950 dark:hover:bg-slate-900/40"
                        : "border-emerald-500/30 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/15"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {n.title}
                        </p>
                        {n.body ? (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                            {n.body}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                        {formatTime(n.created_at)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 dark:border-slate-800 dark:bg-slate-900/70">
                        {notificationKindLabel(n.kind)}
                      </span>
                      {!n.read_at ? (
                        <span className="text-emerald-700 dark:text-emerald-300">
                          Nuevo
                        </span>
                      ) : (
                        <span>Leído</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );

  return createPortal(content, document.body);
}

