import type { ModuleId } from "@/lib/modules/modules";

type ModuleIconProps = {
  id: ModuleId;
  className?: string;
};

export function ModuleIcon({ id, className = "h-5 w-5" }: ModuleIconProps) {
  const base = {
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };

  switch (id) {
    case "dashboard":
      return (
        <svg {...base}>
          <rect x="3" y="3" width="6" height="6" rx="1.2" />
          <rect x="11" y="3" width="6" height="6" rx="1.2" />
          <rect x="3" y="11" width="6" height="6" rx="1.2" />
          <rect x="11" y="11" width="6" height="6" rx="1.2" />
        </svg>
      );
    case "usuario":
      return (
        <svg {...base}>
          <circle cx="10" cy="7" r="3" />
          <path d="M4 17c0-3 2.8-5 6-5s6 2 6 5" />
        </svg>
      );
    case "customers":
      return (
        <svg {...base}>
          <path d="M4 17V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v12" />
          <path d="M12 9h3a1 1 0 0 1 1 1v7" />
          <line x1="3" y1="17" x2="17" y2="17" />
          <path d="M6.5 8h2.5M6.5 11h2.5M6.5 14h2.5" />
        </svg>
      );
    case "caso":
      return (
        <svg {...base}>
          <path d="M3 6.2A1.2 1.2 0 0 1 4.2 5h3.3a1 1 0 0 1 .7.29L9.5 6.5h6.3A1.2 1.2 0 0 1 17 7.7V15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15V6.2z" />
        </svg>
      );
    case "tareas":
      return (
        <svg {...base}>
          <path d="M5.5 4.5h9a1 1 0 0 1 1 1v2.5H4.5V5.5a1 1 0 0 1 1-1z" />
          <path d="M4.5 9h11v6.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V9z" />
          <path d="M7.5 11.5h1.5M7.5 13.5h4" />
        </svg>
      );
    case "agentes":
      return (
        <svg {...base}>
          <circle cx="7" cy="7" r="2.5" />
          <circle cx="14" cy="8" r="2" />
          <path d="M2 17c0-2.5 2.2-4 5-4s5 1.5 5 4" />
          <path d="M11 16.5c0-2 1.5-3 3-3s3 1 3 3" />
        </svg>
      );
    case "accesos":
      return (
        <svg {...base}>
          <path d="M10 2.5L4 5v5c0 4 2.6 6.6 6 7.5 3.4-0.9 6-3.5 6-7.5V5l-6-2.5z" />
          <path d="M7.5 10l1.8 1.8L13 7.7" />
        </svg>
      );
    case "brands":
      return (
        <svg {...base}>
          <path d="M3.2 10V5.5A1.5 1.5 0 0 1 4.7 4h5l6.8 6.8a1.5 1.5 0 0 1 0 2.1l-3.6 3.6a1.5 1.5 0 0 1-2.1 0L3.2 10z" />
          <circle cx="7" cy="7.2" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
