"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
};

type SectionIcon = {
  keywords: string[];
  render: () => ReactNode;
};

const SECTION_ICONS: SectionIcon[] = [
  {
    keywords: ["contexto"],
    render: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-slate-500 dark:text-slate-400"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  {
    keywords: ["recomendación", "recomendacion"],
    render: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-emerald-600 dark:text-emerald-300"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    keywords: [
      "parámetros",
      "parametros",
      "parámetros de corte",
      "condiciones de corte",
    ],
    render: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-sky-600 dark:text-sky-300"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    keywords: ["riesgos", "riesgo", "ajustes", "precauciones"],
    render: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-amber-600 dark:text-amber-300"
        aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    keywords: [
      "siguiente paso",
      "siguientes pasos",
      "próximo paso",
      "proximo paso",
      "próximos pasos",
    ],
    render: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-violet-600 dark:text-violet-300"
        aria-hidden="true"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    ),
  },
  {
    keywords: ["resultado"],
    render: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-emerald-600 dark:text-emerald-300"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    keywords: ["interpretación", "interpretacion"],
    render: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-sky-600 dark:text-sky-300"
        aria-hidden="true"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
];

function iconForHeading(text: string): ReactNode {
  const normalized = text.trim().toLowerCase().replace(/[:：]$/, "");
  for (const entry of SECTION_ICONS) {
    if (entry.keywords.some((k) => normalized.startsWith(k))) {
      return entry.render();
    }
  }
  return null;
}

function extractText(children: ReactNode): string {
  if (children === null || children === undefined) return "";
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (typeof children === "object" && "props" in children) {
    return extractText(
      (children as { props: { children?: ReactNode } }).props.children,
    );
  }
  return "";
}

export function MessageContent({ content }: Props) {
  return (
    <div className="space-y-3 text-sm leading-6 text-slate-900 dark:text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => {
            const icon = iconForHeading(extractText(children));
            return (
              <h3 className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                {icon}
                <span>{children}</span>
              </h3>
            );
          },
          h2: ({ children }) => {
            const icon = iconForHeading(extractText(children));
            return (
              <h3 className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                {icon}
                <span>{children}</span>
              </h3>
            );
          },
          h3: ({ children }) => {
            const icon = iconForHeading(extractText(children));
            return (
              <h4 className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                {icon}
                <span>{children}</span>
              </h4>
            );
          },
          p: ({ children }) => (
            <p className="whitespace-pre-wrap break-words">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5 marker:text-slate-400 dark:marker:text-slate-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5 marker:text-slate-500 dark:marker:text-slate-400">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-slate-50">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800 dark:bg-slate-800 dark:text-slate-100">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] leading-5 dark:border-slate-800 dark:bg-slate-950/60">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-slate-300 pl-3 text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="my-2 border-slate-200 dark:border-slate-800/80" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold dark:border-slate-800 dark:bg-slate-900/60">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-2 py-1 align-top dark:border-slate-800">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
