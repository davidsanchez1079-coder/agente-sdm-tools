# Resumen de cambios - Tareas workspace

Fecha: 2026-05-07
Producción validada: https://agente-sdm-tools.vercel.app

## Resumen funcional

Se incorporó el módulo de Tareas al workspace para llevar seguimiento interno de pendientes, responsables, vencimientos y avances por hilo. La opción quedó visible desde el dashboard principal y el menú lateral.

Actividades actualizadas:

- Alta de tareas internas o asociadas a cliente.
- Listado general de tareas del workspace.
- Dashboard operativo con tareas asignadas al usuario y tareas creadas por el usuario.
- Filtros en "Creadas por mí" por estado: todas, pendiente, en curso, hecha y cancelada.
- Filtro adicional por responsable en tareas creadas por el usuario.
- Detalle de tarea con hilo cronológico de notas.
- Reasignación de responsable desde el detalle.
- Cambio rápido de vencimiento al reasignar o desde edición de detalle.
- Captura/subida de fotos y archivos desde el hilo de la tarea.
- Las fotos tomadas desde celular quedan guardadas como nota con adjunto y se pueden abrir desde el hilo.

## Resumen técnico

Se agregaron rutas App Router para el módulo:

- `/app/tareas`
- `/app/tareas/dashboard`
- `/app/tareas/list`
- `/app/tareas/[taskId]`

Se incorporaron helpers en `src/lib/workspace-tasks` para:

- Etiquetas de estados y prioridades.
- Miembros asignables.
- CRUD básico de tareas.
- CRUD de notas.
- Subida de adjuntos de notas a Supabase Storage.
- Generación de URLs firmadas para visualizar adjuntos privados.

Se actualizó la navegación del sistema:

- Registro del módulo `tareas` en `src/lib/modules/modules.ts`.
- Icono del módulo en `src/components/ui/module-icon.tsx`.
- Entrada en el sidebar.
- Tile de acceso en la pantalla principal de `/app`.

## Base de datos y Storage

Se agregaron migraciones para:

- Tabla `workspace_tasks`.
- Columnas en español y ajustes de defaults/nullability.
- Relación opcional con cliente.
- Tabla `workspace_task_notes`.
- Bucket privado `workspace-task-attachments`.
- Metadatos opcionales de adjunto en `workspace_task_notes`.
- Políticas RLS para tareas, notas y adjuntos limitadas a roles internos autorizados.

Nota operativa: la migración de adjuntos se aplicó directamente con `supabase db query --linked` porque el historial remoto de migraciones tiene versiones que no existen localmente y `supabase db push` no podía avanzar sin reparar/pullar el historial remoto.

## Producción

Se publicó a producción en Vercel después de validar build local.

Validaciones realizadas:

- `npm run build` correcto.
- Schema de Supabase verificado para bucket y columna de adjunto.
- Deploy Vercel `READY`.
- Logs de error de producción sin errores recientes.

## Siguiente forma de trabajo

Este punto queda como respaldo estable de producción. Para nuevos ajustes, continuar en servidor local y no volver a desplegar hasta validar los siguientes cambios.
