# Agente SDM Tools

Agente IA especialista en mecanizado CNC para el equipo de ventas y técnicos de Servicios Tecnológicos Amadeus / Sadama Industries.

## ¿Qué es este proyecto?

Una aplicación web (PWA) que funciona como aplicacionista senior virtual, disponible 24/7 desde el celular, que ayuda a los vendedores y técnicos a resolver problemas de mecanizado CNC en campo, recomendar herramientas de corte, analizar desgastes y virutas a partir de fotos, y mantener un historial organizado por cliente y caso.

Domina las marcas indexadas del catálogo comercial: Sandvik Coromant, Vargus, Korloy (V1) → Dormer Pramet, Boehlerit (V1.2 y V1.3).

## ¿A quién está dirigido?

- Usuarios internos (V1): 10 vendedores y técnicos de Sadama Industries.
- Administradores: Dirección (Ing. David Sánchez) y Gerencia de Ventas.
- V2 futuro: Potencial apertura a clientes externos como servicio de valor agregado.

## Stack técnico

- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS, PWA offline.
- Backend: Supabase Pro (Postgres + Auth + Storage + pgvector).
- IA: Claude Sonnet 4.5 (texto) + GPT-4o (imágenes) + OpenAI embeddings.
- Infraestructura pesada: Servidor jdsanchez (pipelines de indexación, OCR, respaldos, monitoreo).
- Hospedaje: Vercel Pro (frontend) + Supabase Cloud (backend).

## Documentación

La especificación técnica completa del proyecto está en ARCHITECTURE.md.

Ese documento cubre:

- Contexto de negocio y objetivos
- Usuarios, roles y permisos
- Módulos, flujos y reglas de negocio
- Muro de marcas (regla comercial crítica)
- Esquema de base de datos
- Pipeline de RAG (indexación de catálogos)
- Arquitectura técnica detallada
- Seguridad, respaldos y monitoreo
- Roadmap por fases (V1 → V1.3)
- Criterios de aceptación

## Estado actual

Fase 0 — Preparación. El repositorio contiene solo documentación. No hay código de aplicación aún.

## Roadmap de alto nivel

- V1 — Sandvik completo + Vargus enfocado + login + workspace + chat + análisis imágenes + PWA offline + export PDF.
- V1.1 — Korloy + memoria colectiva + export WhatsApp.
- V1.2 — Dormer Pramet + dashboard admin completo.
- V1.3 — Boehlerit + optimizaciones de costo.

## Licencia

Código propietario de Servicios Tecnológicos Amadeus. Todos los derechos reservados.

## Contacto

Ing. David Sánchez  
Director · Servicios Tecnológicos Amadeus
