"use client";

import { useEffect, useRef } from "react";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function GotiaBackground() {
  const raf = useRef<number | null>(null);
  const target = useRef({ x: 0.5, y: 0.35 });
  const current = useRef({ x: 0.5, y: 0.35 });

  useEffect(() => {
    const root = document.documentElement;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const setVars = (x: number, y: number) => {
      root.style.setProperty("--gotia-mx", String(x));
      root.style.setProperty("--gotia-my", String(y));
    };

    const animate = () => {
      const ease = prefersReduced ? 1 : 0.08;
      current.current.x += (target.current.x - current.current.x) * ease;
      current.current.y += (target.current.y - current.current.y) * ease;
      setVars(current.current.x, current.current.y);

      raf.current = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (e: PointerEvent) => {
      const x = clamp01(e.clientX / Math.max(1, window.innerWidth));
      const y = clamp01(e.clientY / Math.max(1, window.innerHeight));
      target.current = { x, y };
      if (prefersReduced) setVars(x, y);
    };

    const onScroll = () => {
      const y = clamp01(
        (window.scrollY || 0) / Math.max(1, document.body.scrollHeight),
      );
      root.style.setProperty("--gotia-scroll", String(y));
    };

    setVars(current.current.x, current.current.y);
    onScroll();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    if (!prefersReduced) raf.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      if (raf.current != null) window.cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="gotia-bg pointer-events-none fixed inset-0 -z-10"
    >
      <div className="gotia-bg__stars" />
      <div className="gotia-bg__mesh" />
      <div className="gotia-bg__orbs" />
      <div className="gotia-bg__noise" />
      <div className="gotia-bg__vignette" />
    </div>
  );
}

