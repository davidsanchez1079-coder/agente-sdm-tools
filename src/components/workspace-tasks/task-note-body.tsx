"use client";

import { splitTextWithUrls } from "@/lib/text/linkify";

type TaskNoteBodyProps = {
  text: string;
  className?: string;
};

const LINK_CLASS =
  "max-w-full truncate align-bottom text-sky-600 underline underline-offset-2 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300";

const LONG_TEXT_THRESHOLD = 72;

function LongTextSegment({ value }: { value: string }) {
  if (value.length <= LONG_TEXT_THRESHOLD) {
    return <>{value}</>;
  }
  return (
    <span
      className="inline-block max-w-full truncate align-bottom"
      title={value}
    >
      {value}
    </span>
  );
}

/** Texto de nota con URLs clicables y truncado + tooltip en segmentos largos. */
export function TaskNoteBody({ text, className = "" }: TaskNoteBodyProps) {
  const parts = splitTextWithUrls(text);
  if (parts.length === 0) return null;

  return (
    <span
      className={`block min-w-0 max-w-full whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 dark:text-slate-100 ${className}`}
    >
      {parts.map((part, i) => {
        if (part.type === "url") {
          return (
            <a
              key={`u-${i}-${part.href}`}
              href={part.href}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
              title={part.value}
            >
              {part.value}
            </a>
          );
        }
        return (
          <LongTextSegment key={`t-${i}`} value={part.value} />
        );
      })}
    </span>
  );
}
