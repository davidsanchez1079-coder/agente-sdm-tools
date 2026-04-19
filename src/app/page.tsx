import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";

const fases = [
  "Fase 0 lista: documentación inicial en GitHub.",
  "Fase 1 en curso: base web y esquema SQL preparados.",
  "Supabase ya conectado a nivel de configuración pública.",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-16 md:px-10">
        <div className="inline-flex w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-300">
          Agente SDM Tools · fase 1
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-8">
            <div className="max-w-3xl space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
                Agente IA especialista en mecanizado CNC para Amadeus y Sadama.
              </h1>
              <p className="text-lg leading-8 text-slate-300 md:text-xl">
                Base inicial del proyecto web con Supabase ya preparado para autenticación,
                crecimiento del workspace y conexión posterior al pipeline técnico.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {fases.map((fase) => (
                <article
                  key={fase}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
                >
                  <p className="text-sm leading-7 text-slate-300">{fase}</p>
                </article>
              ))}
            </div>
          </div>

          <Suspense
            fallback={
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-300">
                Cargando acceso...
              </div>
            }
          >
            <AuthShell />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
