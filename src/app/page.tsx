const fases = [
  "Fase 0 lista: documentación inicial en GitHub.",
  "Fase 1 en curso: base web y esquema SQL preparados.",
  "Pendiente: conectar Supabase y aplicar el esquema real.",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-16 md:px-10">
        <div className="inline-flex w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-300">
          Agente SDM Tools · staging base
        </div>

        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Agente IA especialista en mecanizado CNC para Amadeus y Sadama.
          </h1>
          <p className="text-lg leading-8 text-slate-300 md:text-xl">
            Base inicial del proyecto web. Esta etapa deja lista la estructura para conectar
            autenticación, base de datos, RAG y modos especialistas sin mezclar marcas.
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
      </section>
    </main>
  );
}
