# ARCHITECTURE.md — Agente SDM Tools

Proyecto: Agente IA especialista en mecanizado CNC  
Cliente: Servicios Tecnológicos Amadeus / Sadama Industries  
Responsable: Ing. David Sánchez, Director  
Versión: 1.0 — Cierre de fase estratégica

## Índice

- [A. Resumen ejecutivo](#a-resumen-ejecutivo)
- [B. Problema de negocio](#b-problema-de-negocio)
- [C. Objetivo estratégico](#c-objetivo-estratégico)
- [D. Recomendación de implementación](#d-recomendación-de-implementación)
- [E. Usuarios, roles y permisos](#e-usuarios-roles-y-permisos)
- [F. Módulos del sistema](#f-módulos-del-sistema)
- [G. Flujos principales](#g-flujos-principales)
- [H. Reglas de negocio](#h-reglas-de-negocio)
- [I. Alcance del MVP (V1)](#i-alcance-del-mvp-v1)
- [J. Versión mínima vendible](#j-versión-mínima-vendible)
- [K. Estructura lógica de datos](#k-estructura-lógica-de-datos)
- [L. Pantallas y navegación](#l-pantallas-y-navegación)
- [M. Arquitectura técnica recomendada](#m-arquitectura-técnica-recomendada)
- [N. Plan de staging y publicación](#n-plan-de-staging-y-publicación)
- [O. Roadmap por fases](#o-roadmap-por-fases)
- [P. Riesgos del proyecto](#p-riesgos-del-proyecto)
- [Q. Primer módulo a desarrollar](#q-primer-módulo-a-desarrollar)
- [R. Errores a evitar](#r-errores-a-evitar)
- [S. Prompt técnico final](#s-prompt-técnico-final)

## A. Resumen ejecutivo

Agente IA experto en mecanizado CNC y selección de herramientas de corte, accesible desde celular y escritorio como aplicación web PWA, disponible 24/7 para el equipo interno de vendedores y técnicos.

Funciona como un aplicacionista senior virtual que domina múltiples marcas representadas por la distribuidora, responde consultas técnicas en campo, analiza imágenes de desgaste / viruta / planos, y mantiene memoria persistente de casos organizados por cliente. La aplicación opera como un Notion técnico, con workspace personal por usuario y supervisión silenciosa por administración.

## B. Problema de negocio

El ciclo actual de atención técnica sigue este flujo:

- Vendedor visita cliente.
- Hace levantamiento del problema.
- Regresa a oficina.
- Consulta con David o con proveedor externo.
- Investiga en catálogos físicos o digitales.
- Regresa al cliente con recomendación.
- Coordina prueba en planta.

Este ciclo es lento, depende críticamente de David como experto técnico único, limita la autonomía de vendedores junior, y crea un cuello de botella que frena el ciclo de venta y la calidad de atención al cliente.

## C. Objetivo estratégico

- Democratizar el expertise técnico dentro del equipo.
- Reducir drásticamente el tiempo de respuesta técnica al cliente.
- Liberar a David del rol de consultor interno de guardia.
- Construir base de conocimiento institucional reutilizable.
- Generar diferenciador comercial frente a otras distribuidoras.

## D. Recomendación de implementación

Arquitectura híbrida multicapa:

- Frontend (aplicación web PWA): Next.js en Vercel.
- Backend, BD, Auth, Storage, Vector Store: Supabase Pro con pgvector.
- Pipelines pesados (indexación PDFs, OCR, respaldos, monitoreo): Servidor jdsanchez.
- IA: Claude Sonnet 4.5 (texto técnico) + GPT-4o (análisis de imágenes) + OpenAI embeddings (RAG).

Balance costo-beneficio: ~$115–275 USD/mes en operación estable. Aprovecha el servidor actual de David para procesos batch (su fortaleza) sin ponerlo como cuello de botella de producción.

## E. Usuarios, roles y permisos

### Rol Usuario (vendedores y técnicos — ~10 personas en V1)

- Acceso a su workspace personal exclusivo.
- Crear, editar y eliminar carpetas, sub-carpetas y casos propios.
- Chatear con el agente en Modo General y Modo Especialista por marca.
- Subir archivos e imágenes para análisis técnico.
- Registrar resultados de prueba (sugerido, no obligatorio).
- Compartir copia estática de caso con compañero del equipo.
- Exportar resumen de caso a PDF o WhatsApp.

### Rol Administrador (David + Gerente de Ventas)

- Todas las capacidades del rol Usuario.
- Acceso silencioso al workspace de cualquier usuario (sin notificación ni log visible).
- Dashboard esencial: usuarios activos, consultas totales, porcentaje de casos con resultado.
- Gestión de contenido indexado: carga de PDFs, versionado, validación.

### Seguridad

- 2FA obligatorio para administradores.
- 2FA opcional para usuarios.
- Row Level Security (RLS) a nivel base de datos.

## F. Módulos del sistema

- Autenticación y gestión de usuarios.
- Workspace personal con carpetas y sub-carpetas (máximo 2 niveles).
- Gestión de casos (CRUD + estados).
- Chat con memoria persistente por caso.
- Motor del agente IA con múltiples modos (General + Especialistas por marca).
- Muro de marcas (regla de aislamiento comercial).
- RAG sobre catálogos indexados.
- Análisis multimodal (imágenes + texto).
- Registro de resultados de prueba.
- Compartir casos (copia estática).
- Exportación (PDF + WhatsApp).
- Búsqueda global en workspace personal.
- Notificaciones push (casos compartidos + recordatorio de resultados).
- Guardado local de borradores (PWA offline).
- Dashboard admin esencial.
- Gestión de contenido (interna, ordenada).
- Sistema de monitoreo y alertas.

## G. Flujos principales

### Flujo A — Consulta de vendedor en campo

- Login desde el celular.
- Home / Workspace personal.
- Seleccionar o crear carpeta (ejemplo: Cliente X).
- Crear o entrar a sub-carpeta (ejemplo: Prueba 1 - Vibración).
- Crear o entrar a caso.
- Seleccionar modo: General o Especialista por marca.
- Escribir consulta o subir foto con pregunta.
- Agente responde con formato estándar.
- Conversación iterativa.
- Vendedor realiza prueba en planta.
- Regresa y cierra el caso.
- Modal sugiere (no obliga) registrar resultado.
- Opcionalmente: exportar a PDF, compartir por WhatsApp, o compartir con compañero.

### Flujo B — Supervisión administrativa

- Login como administrador.
- Dashboard esencial.
- Selección de usuario del equipo.
- Vista silenciosa de su workspace completo (lectura).
- Revisión de casos y desempeño.

## H. Reglas de negocio

### Muro de marcas (regla crítica, no negociable)

- Modo General: el agente cruza información de todas las marcas indexadas y usa conocimiento técnico transversal de mecanizado.
- Modo Especialista (Sandvik / Vargus / Korloy / Dormer / Boehlerit): el agente solo recomienda productos, grados, geometrías, códigos y parámetros de esa marca específica.
- Conocimiento técnico general (vibración, desgaste, tenacidad, física del corte) es transversal y se usa en cualquier modo aunque provenga del handbook de una marca específica.

### Comportamientos del agente

- Cuando no sabe: responde con conocimiento general de mecanizado sin mencionar marcas específicas fuera de catálogo.
- Fuera del dominio técnico: declina educadamente. Dominio válido: marcas indexadas, mecanizado, materiales metálicos, máquinas-herramienta, sujeciones, condiciones de corte, fluidos de corte, metrología (orientativa), resolución de problemas técnicos, herramental.
- Cambio de modo en chat: aviso rápido con confirmación, contexto se mantiene, nuevas reglas aplican desde ese punto.

### Reglas operativas

- Subida de foto: requiere texto con pregunta para análisis IA. Sin texto, la foto solo se archiva sin consumir presupuesto de IA.
- Registro de resultado: sugerido al cerrar caso, no obligatorio. Recordatorio automático suave tras X días.
- Compartir entre vendedores: copia estática (modelo WhatsApp). Receptor decide si guarda.
- Acceso administrativo: silencioso, sin notificación al usuario, sin log visible.
- Anidación de carpetas: máximo 2 niveles (Carpeta → Sub-carpeta → Caso).

### Formato estándar de respuesta del agente

- Contexto técnico ejecutivo (1–3 líneas).
- Recomendación concreta (respetando muro de marcas).
- Parámetros de corte de arranque (Vc, fn, ap, refrigerante).
- Consideraciones de riesgo y ajustes posibles.
- Enlace al producto en web oficial de la marca (si aplica).
- Botón "Generar resumen" para exportación.

Idioma: español mexicano, técnico, directo.

## I. Alcance del MVP (V1)

### Dentro del alcance

- Todas las operaciones de Sandvik Coromant:

Torneado: general, tronzado/ranurado, roscado, multifuncionales, tool holding, adaptadores.
- Rotativas: fresado, taladrado, mandrinado, adaptadores.
- Vargus enfocado a sus familias fuertes (roscado y ranurado).
- Los 17 módulos listados en sección F.
- Los 14 flujos y pantallas principales.

### Fuera del alcance V1

- Korloy (entra en V1.1).
- Dormer Pramet (entra en V1.2).
- Boehlerit (entra en V1.3).
- Memoria colectiva entre usuarios (entra en V1.1).
- Exportar WhatsApp (entra en V1.1).
- Dashboard admin avanzado con métricas (entra en V1.2).
- Acceso para clientes externos (V2).
- Integración con Alpha ERP (V2).
- Captura sistemática de know-how privado de David (V2).
- Scraping de webs de marcas.
- Conexión a APIs de fabricantes.
- Compra/pedido desde la app.
- CRM completo de clientes.
- App nativa iOS/Android (se resuelve con PWA).

## J. Versión mínima vendible

Un vendedor puede, desde su celular:

- Iniciar sesión en la app.
- Escribir una pregunta técnica de torneado o fresado en Sandvik.
- Recibir respuesta estructurada con parámetros de corte y enlace al producto.
- Subir foto de desgaste o pieza para análisis técnico con pregunta.
- Guardar el caso en una carpeta organizada por cliente.

Eso es el mínimo publicable.

## K. Estructura lógica de datos

### Entidades principales

- users: datos básicos, rol, estado.
- workspaces: uno por usuario.
- folders: nivel 1, dentro de workspace.
- subfolders: nivel 2 opcional, dentro de folder (modelado como folder con parent_folder_id).
- cases: dentro de folder o subfolder. Metadata: cliente, operación, material, máquina, marca preferida, estado.
- messages: dentro de caso. Autor (user | agent), modo usado, tokens, costo.
- attachments: dentro de caso. Imagen, PDF, plano. Con flag de análisis IA.
- test_results: vinculado a caso cerrado. ¿Funcionó?, parámetros finales, notas.
- brands: Sandvik, Vargus, Korloy, Dormer, Boehlerit. Estado: indexed | coming_soon.
- indexed_chunks: fragmentos de RAG con metadata (marca, familia, operación, material ISO, página, versión).
- agent_queries: log de cada consulta (usuario, caso, modo, tiempo, costo, fuentes).
- share_events: registro de cada copia compartida entre usuarios.

### Relaciones clave

User (1) ─── Workspace (1)  
 │  
 └── Folders (*)  
     │  
     ├── Subfolders (*) [parent_folder_id]  
     │    │  
     │    └── Cases (*)  
     │  
     └── Cases (*)  
          │  
          ├── Messages (*)  
          ├── Attachments (*)  
          └── TestResult (0..1)

Brand (1) ─── IndexedChunks (*)

### Trazabilidad

- Todas las consultas al agente quedan registradas (timestamp, modo, costo, fuentes citadas).
- Accesos de administradores sin log visible al usuario (supervisión silenciosa).
- Documentos indexados con versión y fecha para actualización sin pérdida.

## L. Pantallas y navegación

### Pantallas de usuario

- Login.
- Home / Workspace personal.
- Vista de carpeta.
- Vista de sub-carpeta.
- Vista de caso (chat con agente — la pantalla más importante).
- Modal Cerrar caso.
- Modal Generar resumen.
- Modal Compartir con compañero.
- Búsqueda global.
- Perfil y ajustes.

### Pantallas de administrador

- Dashboard admin.
- Lista de usuarios del equipo.
- Vista de workspace de otro usuario (modo lectura).
- Gestión de contenido (interna, ordenada).

## M. Arquitectura técnica recomendada

### Mundo 1 — Aplicación web

- Framework: Next.js 14+ con App Router, TypeScript.
- Estilos: Tailwind CSS + shadcn/ui.
- PWA: service worker para instalación + offline.
- Offline: IndexedDB para borradores locales.
- Hospedaje: Vercel Pro (~$20 USD/mes).

### Mundo 2 — Backend y datos

- Proveedor: Supabase Pro (~$25 USD/mes).
- Base de datos: Postgres con Row Level Security.
- Autenticación: Supabase Auth (email + password + 2FA TOTP).
- Storage: archivos adjuntos de casos.
- Vector store: pgvector para RAG.

### Mundo 3 — Agente IA

- Modelo texto: Claude Sonnet 4.5 vía Anthropic API.
- Modelo visión: GPT-4o vía OpenAI API.
- Embeddings: OpenAI text-embedding-3-large.
- Orquestación: Node.js serverless functions en Vercel.

### Mundo 4 — Servidor jdsanchez (pipelines)

- Pipeline de indexación: scripts Python (OCR, chunking, embeddings, upload).
- Cron jobs nocturnos: respaldo semanal, reindexación.
- Monitoreo: alertas por WhatsApp vía CallMeBot.
- No es producción: solo procesos batch y staging.

### Presupuesto mensual estimado

| Concepto | USD/mes |
|---|---:|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| API IA texto (Claude) | $40–80 |
| API IA imágenes (GPT-4o) | $30–150 |
| API embeddings | $30–50 (inicial), luego mínimo |
| **Total operación estable** | **~$115–275 USD** |

## N. Plan de staging y publicación

### Ambiente staging

- Ubicación: servidor jdsanchez.
- URL: interna (ejemplo: staging-sdm.sadama-interno.com).
- Base de datos: Supabase free tier con datos ficticios.
- Propósito: pruebas de nuevas versiones sin tocar producción.

### Ambiente producción

- Ubicación: Vercel Pro + Supabase Pro.
- URL: dominio oficial (a definir: agente.amadeus.mx, sdm-tools.amadeus.mx o similar).
- Base de datos: Supabase Pro con datos reales.
- Monitoreo: activo con alertas WhatsApp ante fallos.

### Flujo de release

Todo cambio: staging → validación piloto → producción. Nunca directo a producción.

## O. Roadmap por fases

Sin tiempos. Se ejecuta conforme a capacidad y dedicación disponible.

### Fase 0 — Preparación

- Inventario formal de PDFs disponibles (Sandvik y Vargus para V1).
- Creación de cuentas: Vercel Pro, Supabase Pro, Anthropic API, OpenAI API.
- Registro de dominio.
- Creación de repositorio Git privado.
- Decisión de quién construye.

### Fase 1 — Infraestructura base

- Configuración Vercel + Supabase.
- Esquema de base de datos desplegado.
- Ambiente staging funcional.

### Fase 2 — Pipeline de indexación

- Scripts en jdsanchez: OCR, chunking por familia, metadata enriquecida, embeddings, upload a pgvector.
- Validación con 1 PDF de prueba.

### Fase 3 — Indexación Sandvik

- Metalcutting Technical Guide completo.
- Catálogos por familia (torneado, tronzado, roscado, multifuncionales, tool holding, fresado, taladrado, mandrinado, adaptadores).
- Batería de 30+ preguntas de validación.

### Fase 4 — Agente base

- Prompt de sistema con reglas de muro de marcas.
- Modo General funcional.
- Validación técnica con David + 1 vendedor senior.

### Fase 5 — Aplicación web base

- Login con Supabase Auth.
- Workspace personal.
- Carpetas y sub-carpetas.
- Vista de caso con chat funcional.

### Fase 6 — Modos especialistas

- Modo Especialista Sandvik.
- Cambio de modo con aviso.
- Pruebas trampa del muro de marcas.

### Fase 7 — Vargus

- Indexación de catálogos Vargus (roscado y ranurado).
- Modo Especialista Vargus.
- Pruebas cruzadas entre marcas.

### Fase 8 — Funciones críticas

- Análisis de imágenes con GPT-4o.
- Registro de resultado al cerrar caso.
- Exportar PDF.
- Compartir copia entre usuarios.
- PWA offline con borradores locales.

### Fase 9 — Admin y gestión de contenido

- Dashboard esencial.
- Gestión de contenido interna y ordenada.

### Fase 10 — Piloto

- 2–3 vendedores usan la app en campo real.
- Iteración con feedback.
- Correcciones críticas.

### Fase 11 — Lanzamiento V1

- Onboarding completo del equipo (10 usuarios).
- Política de uso publicada y aceptada.
- Monitoreo activo.

### Fases posteriores

- V1.1: Korloy + memoria colectiva + exportar WhatsApp.
- V1.2: Dormer Pramet + dashboard admin completo.
- V1.3: Boehlerit + optimización de costos.

## P. Riesgos del proyecto

### Priorizados por impacto

- Calidad del RAG (técnico alto). Mitigación: iteración continua desde Fase 2, chunking cuidadoso, validación con preguntas reales.
- Falta de curaduría técnica (operativo alto). David debe reservar bloques consistentes de tiempo como curador. No es delegable.
- Adopción del equipo (negocio alto). Mitigación: onboarding cuidadoso + piloto antes de abrir al equipo completo.
- Costos de IA descontrolados (financiero medio). Mitigación: dashboard de costos + límites por usuario + caché de preguntas repetidas.
- Ruptura del muro de marcas (comercial medio). Mitigación: batería de pruebas trampa obligatoria en cada release.
- Dependencia de servicios externos (técnico bajo). Mitigación: código agnóstico, SLAs altos de Vercel/Supabase/Anthropic/OpenAI.

## Q. Primer módulo a desarrollar

Pipeline de indexación de PDFs en jdsanchez.

Razón: es el cuello de botella real del proyecto. Se puede validar aisladamente antes de construir frontend. Si falla, toda la app falla. Es preferible descubrirlo temprano que tarde.

## R. Errores a evitar

- No lanzar sin piloto real con 2–3 vendedores en campo.
- No saltar la curaduría técnica de David.
- No relajar el muro de marcas para ahorrar tiempo.
- No agregar funcionalidades nuevas durante el V1.
- No descuidar costos de IA en las primeras semanas post-lanzamiento.
- No publicar cambios directos a producción sin pasar por staging.
- No ignorar la retroalimentación del piloto.
- No usar el servidor jdsanchez como producción (solo pipelines y staging).

## S. Prompt técnico final

Documento ejecutable para entregar a desarrollador, Claude Code, Cursor o cualquier IA programadora.

### PROYECTO
Agente SDM Tools  
CLIENTE: Servicios Tecnológicos Amadeus / Sadama Industries  
TIPO: Aplicación web PWA (responsive, mobile-first) con agente IA especialista en mecanizado CNC.

### CONTEXTO DEL NEGOCIO
Distribuidora industrial mexicana de herramientas de corte CNC que representa marcas como Sandvik Coromant, Vargus, Korloy, Dormer Pramet y Boehlerit. Los vendedores y técnicos visitan plantas de manufactura para resolver problemas de mecanizado y recomendar productos. El agente IA es un aplicacionista senior virtual disponible en el celular para asistir al equipo en campo.

### STACK TÉCNICO OBLIGATORIO

**FRONTEND**
- Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- PWA con service worker.
- Offline: guardado de borradores con IndexedDB.
- Hospedaje: Vercel.

**BACKEND Y DATOS**
- Supabase Pro.
- Postgres con Row Level Security (RLS).
- Auth (correo + contraseña + 2FA TOTP para admins).
- Storage para archivos adjuntos.
- pgvector para RAG.

**AGENTE IA**
- Texto técnico: Claude Sonnet 4.5 vía Anthropic API.
- Análisis de imágenes: GPT-4o vía OpenAI API.
- Embeddings: OpenAI text-embedding-3-large.
- Orquestación: Node.js serverless en Vercel.

**PIPELINES PESADOS**
- Servidor Linux jdsanchez (usuario sin root).
- Scripts Python para OCR, chunking, embeddings, upload Supabase.
- Cron jobs nocturnos para respaldo semanal y reindexación.
- Alertas por WhatsApp vía CallMeBot ante fallos.

### ESQUEMA DE BASE DE DATOS

```sql
users (
 id, nombre, apellido, email, telefono,
 rol [admin | user], activo, created_at
)

workspaces (
 id, user_id, created_at
)

folders (
 id, workspace_id, parent_folder_id [null si nivel 1],
 nombre, created_at
)

cases (
 id, folder_id, titulo, cliente, operacion, material,
 maquina, marca_preferida,
 estado [abierto | en_prueba | cerrado_exito |
 cerrado_sin_exito | cerrado_sin_datos],
 shared_from_case_id [null si no es copia],
 created_at, updated_at
)

messages (
 id, case_id, author [user | agent], content,
 mode_used [general | sandvik | vargus | korloy | dormer | boehlerit],
 tokens_input, tokens_output, cost_usd, created_at
)

attachments (
 id, case_id, file_url, file_type [image | pdf | other],
 filename, size_bytes, analyzed_by_ai [bool],
 user_prompt, created_at
)

test_results (
 id, case_id, worked [yes | partial | no],
 final_parameters, notes, registered_at
)

brands (
 id, nombre, status [indexed | coming_soon]
)

indexed_chunks (
 id, brand_id, family, operation, material_iso,
 page, version, content,
 embedding vector(3072), created_at
)

agent_queries (
 id, user_id, case_id, message_id, mode,
 response_time_ms, cost_usd, sources_cited, created_at
)

share_events (
 id, sender_case_id, receiver_case_id,
 sender_id, receiver_id, created_at
)
```

### REGLAS DE NEGOCIO CRÍTICAS

**MURO DE MARCAS (NO NEGOCIABLE)**
- Modo General: el agente cruza información de todas las marcas indexadas y usa conocimiento técnico transversal.
- Modo Especialista (por marca): solo recomienda productos, grados, geometrías, códigos y parámetros de esa marca.
- Conocimiento técnico general es transversal y se usa en cualquier modo.
- Implementación: prompt de sistema distinto por modo + filtro de metadata en queries RAG.

**CUANDO NO SABE**
- Responde con conocimiento general de mecanizado sin mencionar marcas específicas fuera de catálogo.

**FUERA DEL DOMINIO TÉCNICO**
- Declina educadamente en español mexicano.

**CAMBIO DE MODO EN CHAT**
- Mostrar aviso y confirmar con tap.
- El aviso se muestra solo la primera vez por caso.

**FOTOS**
- Al subir imagen, campo de texto obligatorio con la pregunta.
- Si hay texto: se envía a GPT-4o.
- Si no: solo se archiva.

**REGISTRO DE RESULTADO**
- Al cerrar caso, modal sugiere llenar resultado, no obligatorio.
- Notificación push suave si pasa X días sin resultado.

**COMPARTIR**
- Copia estática del caso al workspace del receptor.
- Registro en share_events.
- Receptor recibe notificación push.

**ADMIN**
- Acceso silencioso a workspace de cualquier user.
- Sin notificación al user.

**ANIDACIÓN**
- Máximo 2 niveles: Carpeta → Sub-carpeta → Caso.

### FORMATO ESTÁNDAR DE RESPUESTA
1. Contexto técnico ejecutivo.
2. Recomendación concreta.
3. Parámetros de corte de arranque.
4. Riesgos y ajustes.
5. Enlace al producto oficial si aplica.

Idioma: español mexicano, técnico, directo.

### PIPELINE DE INDEXACIÓN (jdsanchez)
1. Ingesta: PDF a `/home/jdsanchez/sdm-tools/inbox/{brand}/`.
2. OCR con Tesseract o pdftotext.
3. Chunking lógico por familia/sección.
4. Metadata enriquecida.
5. Embeddings con OpenAI text-embedding-3-large.
6. Upload a Supabase `indexed_chunks`.
7. Validación: batería de 30+ preguntas; si precisión < 85%, ajustar chunking.

### ORDEN DE CONSTRUCCIÓN
- FASE 0: Setup cuentas, dominio, repositorio.
- FASE 1: Infraestructura Vercel + Supabase + staging.
- FASE 2: Pipeline de indexación en jdsanchez.
- FASE 3: Indexar Sandvik.
- FASE 4: Agente Modo General con RAG.
- FASE 5: Login + workspace + carpetas + sub-carpetas + casos.
- FASE 6: Chat + Modo Especialista Sandvik + muro de marcas.
- FASE 7: Vargus.
- FASE 8: Imágenes + resultados + export PDF + compartir + offline.
- FASE 9: Dashboard admin + gestión contenido.
- FASE 10: Piloto.
- FASE 11: Lanzamiento V1.

### CRITERIOS DE ACEPTACIÓN V1
- 10 usuarios concurrentes sin degradación.
- Respuesta del agente < 8 segundos en móvil con 4G (texto).
- Respuesta con imagen < 20 segundos.
- Muro de marcas validado con 20+ preguntas trampa.
- 30+ preguntas técnicas respondidas correctamente.
- Backup semanal probado con restauración exitosa.
- Alertas por WhatsApp funcionando.
- PWA instalable en iOS y Android.
- Guardado offline funcional.

### IMPORTANTE
- Idioma interfaz: español mexicano.
- Todos los precios en MXN cuando aplique.
- Diseño mobile-first.
- Soporte para dictado por voz nativo.
- Nunca mezclar recomendaciones entre marcas en Modo Especialista.
- Admins ven todo, sin logs visibles al usuario.
