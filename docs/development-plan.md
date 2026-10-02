# Plan de desarrollo — MeetFlow

> FASE 0 · Análisis y diseño  
> Referencia al plan principal: [`PLAN_INTEGRACION_MEETFLOW.md`](../PLAN_INTEGRACION_MEETFLOW.md)

---

## Resumen de fases

| Fase | Nombre | Prioridad | Complejidad estimada |
|------|--------|-----------|----------------------|
| FASE 0 | Análisis y diseño | P0 | Baja |
| FASE 1 | Infraestructura base | P0 | Media |
| FASE 2 | Base de datos (usuarios y auth) | P0 | Baja |
| FASE 3 | Autenticación | P0 | Media-Alta |
| FASE 4 | Usuarios y equipos | P0 | Media |
| FASE 5 | Reuniones | P0 | Alta |
| FASE 6 | Participantes y agenda | P0 | Media |
| FASE 7 | Notas y decisiones | P0 | Baja-Media |
| FASE 8 | Tareas y compromisos | P0 | Media |
| FASE 9 | Dashboard y calendario | P1 | Alta |
| FASE 10 | Notificaciones | P1 | Media-Alta |
| FASE 11 | Tiempo real (WebSockets) | P2 | Alta |
| FASE 12 | Auditoría y búsqueda | P1 | Media |
| FASE 13 | Archivos adjuntos | P1 | Media |
| FASE 14 | PWA | P2 | Media |
| FASE 15 | Asistente inteligente | P2 | Alta |
| FASE 16 | Testing E2E integral | P0 | Media |
| FASE 17 | CI/CD y producción | P0 | Media |

---

## Estado actual

```
✅ FASE 0 — Completada
   ✅ requirements.md
   ✅ architecture.md
   ✅ database.md
   ✅ api.md
   ✅ user-flows.md
   ✅ development-plan.md
   ✅ PLAN_INTEGRACION_MEETFLOW.md (plan mejorado)

✅ FASE 1 — Infraestructura base → COMPLETADA
✅ FASE 2 — Base de datos        → COMPLETADA
✅ FASE 3 — Autenticación        → COMPLETADA
✅ FASE 4 — Usuarios y equipos   → COMPLETADA
✅ FASE 5 — Reuniones            → COMPLETADA
✅ FASE 6 — Participantes/Agenda → COMPLETADA
✅ FASE 7 — Notas y decisiones   → COMPLETADA
✅ FASE 8 — Tareas               → COMPLETADA
✅ FASE 9 — Dashboard/Calendario → COMPLETADA
✅ FASE 10 — Notificaciones      → COMPLETADA
✅ FASE 11 — Tiempo real         → COMPLETADA
⬜ FASE 12 — Auditoría/Búsqueda  → PENDIENTE
⬜ FASE 13 — Adjuntos            → PENDIENTE
⬜ FASE 14 — PWA                 → PENDIENTE
⬜ FASE 15 — Asistente IA        → PENDIENTE
⬜ FASE 16 — Testing E2E         → PENDIENTE
⬜ FASE 17 — CI/CD               → PENDIENTE
```

---

## Criterio de aceptación de FASE 0

```
✅ Código implementado (documentación creada)
✅ Actores identificados
✅ Requisitos funcionales documentados (RF-01 a RF-13)
✅ Requisitos no funcionales documentados (RNF-01 a RNF-04)
✅ Casos de uso listados
✅ Arquitectura definida (capas, módulos, patrones)
✅ Schema de base de datos diseñado (crece por fase)
✅ API diseñada (55 endpoints documentados)
✅ Flujos de usuario documentados (8 flujos principales)
✅ Variables de entorno definidas (.env.example)
✅ Convenciones de código acordadas
✅ Estrategia Git definida
✅ Decisiones de arquitectura registradas (ADR §36)
✅ Fuera de scope del MVP documentado
✅ Sin dependencias críticas sin definir
```

---

## Dependencias críticas resueltas

| Dependencia | Decisión tomada |
|-------------|----------------|
| Fechas y zonas horarias | UTC en DB; conversión en frontend; campo `timezone` IANA en `users` y `meetings` |
| Autorización | RBAC con 4 roles; matriz de permisos definida en §10 del plan |
| Contratos API | REST + Swagger como fuente de verdad; `packages/types` para tipos compartidos |
| Motor de búsqueda | PostgreSQL FTS (`tsvector`) sin motor externo |
| Almacenamiento de archivos | Local en dev, S3-compatible en prod; no en base de datos |
| Notificaciones | Módulo desacoplado via EventEmitter2; no message broker en MVP |
| Asistente IA | Google Gemini API con Function Calling; permisos del backend aplicados |
| JWT vs Sessions | JWT (15 min) + Refresh Token (7 días) almacenado en DB |
| Testing | Tests escritos por fase; FASE 16 es solo E2E y cobertura integral |

---

## Próximos pasos — FASE 1

Ver detalle completo en [`PLAN_INTEGRACION_MEETFLOW.md §7`](../PLAN_INTEGRACION_MEETFLOW.md).

### Checklist de arranque de FASE 1

```
[x] Crear estructura de monorepo (backend/, frontend/, packages/*)
[x] Configurar Next.js 14 con TypeScript y Tailwind
[x] Adaptar NestJS existente a backend/
[x] Crear docker-compose.yml con migrate + api + web + db
[ ] Configurar PostgreSQL en Docker
[ ] Configurar variables de entorno (.env + .env.example)
[ ] Configurar @nestjs/swagger en main.ts
[ ] Configurar packages/types con estructura inicial
[ ] Verificar: docker compose up → los tres servicios responden
[ ] Verificar: GET /health → { status: "ok" }
[ ] Verificar: GET /api/docs → Swagger disponible
```

---

## Convenciones de código (resumen)

| Aspecto | Valor |
|---------|-------|
| Idioma del código | Inglés |
| Idioma de comentarios y docs | Español |
| Archivos | `kebab-case.ts` |
| Clases | `PascalCase` |
| Variables/funciones | `camelCase` |
| Tablas DB | `snake_case` |
| IDs | `cuid()` |
| Fechas en DB | UTC |
| Commits | Conventional Commits |
| Ramas | `main`, `developer`, `feature/*`, `fix/*` |

---

## Variables de entorno — resumen

Ver detalle en [`architecture.md §10`](./architecture.md).

Archivo `.env.example` debe existir en cada app antes de comenzar FASE 1.

---

## Módulos NestJS planificados

| Módulo | Archivo raíz | FASE |
|--------|-------------|------|
| `AuthModule` | `auth/auth.module.ts` | FASE 3 |
| `UsersModule` | `users/users.module.ts` | FASE 3 |
| `TeamsModule` | `teams/teams.module.ts` | FASE 4 |
| `MeetingsModule` | `meetings/meetings.module.ts` | FASE 5 |
| `ParticipantsModule` | `participants/participants.module.ts` | FASE 6 |
| `AgendaModule` | `agenda/agenda.module.ts` | FASE 6 |
| `NotesModule` | `notes/notes.module.ts` | FASE 7 |
| `DecisionsModule` | `decisions/decisions.module.ts` | FASE 7 |
| `TasksModule` | `tasks/tasks.module.ts` | FASE 8 |
| `NotificationsModule` | `notifications/notifications.module.ts` | FASE 10 |
| `AuditModule` | `audit/audit.module.ts` | FASE 12 |
| `SearchModule` | `search/search.module.ts` | FASE 12 |
| `AttachmentsModule` | `attachments/attachments.module.ts` | FASE 13 |
| `AssistantModule` | `assistant/assistant.module.ts` | FASE 15 |

---

## Notas importantes para el desarrollo

1. **No crear entidades de Prisma que no correspondan a la fase actual.**
2. **Cada PR debe pasar lint → tsc --noEmit → tests → build antes del merge.**
3. **El schema de Prisma es la fuente de verdad de la base de datos**, no la base de datos en sí.
4. **Swagger debe estar actualizado** al finalizar cada endpoint.
5. **Los tests unitarios se escriben en la misma iteración** que el código de producción.
6. **Las migraciones nunca se editan una vez aplicadas en producción.**
