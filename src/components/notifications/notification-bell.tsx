"use client";

import { useEffect, useRef, useState } from "react";
import { fetchUnreadCount } from "@/lib/notifications/client";
import { NotificationsDrawer } from "./notifications-drawer";

function formatBadge(count: number) {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  async function refresh() {
    try {
      const count = await fetchUnreadCount();
      setUnread(count);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar el contador.");
    }
  }

  useEffect(() => {
    void refresh();
    timer.current = window.setInterval(() => void refresh(), 30000);
    return () => {
      if (timer.current != null) window.clearInterval(timer.current);
    };
  }, []);

  const badge = formatBadge(unread);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir notificaciones"
        title={error ? error : "Notificaciones"}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-400/60 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200 ${className}`}
      >
        <span aria-hidden className="text-base">
          🔔
        </span>
        {badge ? (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
            {badge}
          </span>
        ) : null}
      </button>

      <NotificationsDrawer
        open={open}
        onClose={() => setOpen(false)}
        onUnreadChanged={() => void refresh()}
      />
    </>
  );
}

