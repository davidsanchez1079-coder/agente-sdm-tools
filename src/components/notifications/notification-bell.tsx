"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  fetchUnreadCount,
  markNotificationRead,
} from "@/lib/notifications/client";
import { NotificationsDrawer } from "./notifications-drawer";

function formatBadge(count: number) {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}

function NotificationBellInner({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const deepLinkHandled = useRef<Set<string>>(new Set());
  const notificationId = searchParams.get("notificationId");

  async function refresh() {
    try {
      const count = await fetchUnreadCount();
      setUnread(count);
      setError(null);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "No se pudo cargar el contador.";
      setError(msg);
    }
  }

  useEffect(() => {
    void refresh();
    timer.current = window.setInterval(() => void refresh(), 30000);
    return () => {
      if (timer.current != null) window.clearInterval(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!notificationId || deepLinkHandled.current.has(notificationId)) return;
    deepLinkHandled.current.add(notificationId);

    setOpen(true);
    void (async () => {
      try {
        await markNotificationRead(notificationId);
        await refresh();
      } catch {
        // Si falla (p. ej. notificación de otro usuario), igual abrimos bandeja.
      }
      const next = new URLSearchParams(searchParams.toString());
      next.delete("notificationId");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    })();
  }, [notificationId, pathname, router, searchParams]);

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

export function NotificationBell({ className = "" }: { className?: string }) {
  return (
    <Suspense
      fallback={
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900/70 ${className}`}
          aria-hidden
        >
          🔔
        </span>
      }
    >
      <NotificationBellInner className={className} />
    </Suspense>
  );
}
