"use client";

import { useEffect, useRef, useState } from "react";

type ComboboxProps = {
  value: string;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
};

// Input con typeahead: filtra una lista cerrada por substring
// case-insensitive y solo permite seleccionar valores que existan en
// `options`. Si el usuario escribe algo que no matchea exactamente una
// opción, el valor confirmado no cambia (`onChange` no se dispara).
// Útil para campos catalogados como ciudad de México donde tenemos
// ~250 valores y no queremos texto libre.
export function Combobox({
  value,
  options,
  placeholder,
  disabled,
  emptyMessage = "Sin resultados",
  onChange,
  className = "",
  inputClassName = "",
}: ComboboxProps) {
  const [prevValue, setPrevValue] = useState(value);
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincronizamos draft con value cuando el padre cambia el valor
  // confirmado (e.g. reset de form). Patrón oficial React: comparar
  // prop con estado previo durante render y disparar set-state si
  // difieren. https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (prevValue !== value) {
    setPrevValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
      // Si el draft no es opción válida, revertimos al último valor
      // confirmado para mantener la regla de "solo catálogo".
      if (
        !options.some(
          (opt) => opt.toLowerCase() === draft.toLowerCase(),
        )
      ) {
        setDraft(value);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, options, draft, value]);

  const needle = draft.toLowerCase().trim();
  const filtered = needle
    ? options.filter((opt) => opt.toLowerCase().includes(needle))
    : options;

  function commit(option: string) {
    setDraft(option);
    setOpen(false);
    onChange(option);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        className={inputClassName}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setDraft(value);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlight((current) =>
              Math.min(current + 1, Math.max(0, filtered.length - 1)),
            );
            setOpen(true);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((current) => Math.max(0, current - 1));
          } else if (event.key === "Enter") {
            event.preventDefault();
            const choice = filtered[highlight];
            if (choice) commit(choice);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="combobox-listbox"
      />
      {open && !disabled ? (
        <ul
          id="combobox-listbox"
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-300 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              {emptyMessage}
            </li>
          ) : (
            filtered.map((opt, index) => (
              <li
                key={opt}
                role="option"
                aria-selected={index === highlight}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(opt);
                }}
                onMouseEnter={() => setHighlight(index)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  index === highlight
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
