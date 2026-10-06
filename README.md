# MeetFlow

[![CI](https://github.com/Walthergl66/meeting-management-system/actions/workflows/ci.yml/badge.svg)](https://github.com/Walthergl66/meeting-management-system/actions/workflows/ci.yml)

Sistema de gestión de reuniones: organiza la agenda, anota, decide y asigna
compromisos dentro de equipos con roles. Está pensado para equipos que quieren
que de una reunión **queden decisiones y tareas reales**, no solo una invitación
en el calendario.

## Características

- **Autenticación** con JWT (15 min) + refresh token (7 días) almacenado y
  hasheado en la base de datos; registro, login, cierre de sesión y recuperación
  de contraseña.
- **Equipos y participantes** con RBAC de 4 roles (`OWNER`, `ADMIN`, `MEMBER`,
  `GUEST`) y matriz de permisos por entidad.
- **Reuniones** con estado, franja horaria, participantes y agenda (ítems con
  duración y responsable).
- **Notas y decisiones**, vinculadas a la reunión pero supervivientes al borrado.
- **Tareas y compromisos** asignados a participantes.
- **Dashboard y calendario** con métricas y vista mensual.
- **Notificaciones** (en app) y **tiempo real** por WebSocket (`/realtime`).
- **Auditoría reactiva** de eventos de dominio y **búsqueda** por texto con
  PostgreSQL FTS (`tsvector` + índice GIN, configuración `spanish`).
- **Archivos adjuntos** en almacenamiento local (dev) o S3-compatible (prod).
- **PWA** instalable y **asistente IA** (Google Gemini con Function Calling) que
  respeta los permisos del backend.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind CSS), TanStack Query, React Hook Form + Zod, Socket.IO client |
| Backend | NestJS 10, Prisma 6, PostgreSQL 16, Socket.IO, Swagger (`GET /api/docs`) |
| Infra | Docker Compose, GitHub Actions; build con multi-stage (no-root) |

## Arquitectura

- **Dos proyectos pnpm independientes** (`backend/` y `frontend/`), sin monorepo:
  cada uno con su `package.json`, su lockfile y su `node_modules`.
- **El backend es la fuente de verdad** de las reglas de negocio y el frontend
  no las duplica.
- Los tipos compartidos (enums, permisos, contratos API, validaciones) están
  **duplicados a propósito** en `backend/src/shared/` y `frontend/lib/shared/`.
- Postgres en UTC; el frontend convierte a la zona del usuario (`timezone` IANA).
- Envelope de respuesta consistente: `{ "data": ..., "message": ... }` en éxito y
  `{ statusCode, error, message, timestamp, path, requestId, details }` en error.

## Estructura del repositorio

```
.
├── backend/                  # API NestJS (meetflow-backend)
│   ├── prisma/               # schema.prisma y migraciones
│   ├── src/
│   │   ├── modules/          # 17 módulos de dominio (auth, teams, meetings, …)
│   │   └── shared/           # enums, permisos, tipos API, validaciones
│   └── test/                 # suites e2e (.e2e-spec.ts)
├── frontend/                 # App Next.js (meetflow-frontend)
│   ├── app/                  # rutas (App Router)
│   ├── components/           # UI
│   └── lib/shared/           # duplicado deliberado de backend/src/shared/
├── docs/                     # documentación de FASE 0 (requisitos, arquitectura, API, DB, flujos)
├── .github/workflows/        # ci.yml (gate) y deploy.yml (manual, inerte)
├── docker-compose.yml        # db + migrate + api + web
└── .env.example              # plantilla de variables de entorno
```

## Requisitos

- Node.js ≥ 20 (`.nvmrc` → `20`)
- pnpm `10.34.5` (fijado por `packageManager` en cada proyecto; usa corepack)
- Docker + Docker Compose

## Puesta en marcha (Docker, recomendado)

```bash
cp .env.example .env      # y pon un valor real en JWT_SECRET (ver abajo)
docker compose up -d --build
```

Servicios:

| Servicio | URL | Notas |
|----------|-----|-------|
| `api` | http://localhost:3000 | Healthcheck en `/health`; Swagger en `/api/docs` |
| `web` | http://localhost:3001 | `NEXT_PUBLIC_API_URL` se incrusta en el bundle en build |
| `db` | 127.0.0.1:5432 | Solo en loopback (Puerto por defecto no expuesto a la red) |

El orden de arranque está garantizado por `depends_on`: `db` → `migrate`
(`prisma migrate deploy`) → `api` (requiere `service_completed_successfully`) →
`web`. Si `api` no queda `healthy`, `docker compose up` termina con error y
`docker compose ps` muestra el estado de cada servicio para diagnosticar.

**`JWT_SECRET` es obligatorio** (mínimo 16 caracteres): el compose falla en el
bootstrap con un mensaje claro si no está definido, en lugar de arrancar la API
con el secreto vacío.

Parar: `docker compose down` (conserva los volúmenes `db-data` y `api-uploads`).
Reset total: `docker compose down -v`.

## Desarrollo local

La base de datos puede correr en Docker mientras el backend se ejecuta en el
host. Instala siempre **dentro** de cada paquete, nunca en la raíz.

### Backend (`backend/`)

```bash
pnpm install
pnpm db:generate     # tras instalar o si cambió el schema
pnpm db:migrate -n <nombre>   # crea y aplica una migración
pnpm dev             # nest start --watch, puerto 3000 (usa el .env de la raíz)
```

Scripts de base de datos (`db:*`) usan `dotenv -e ../.env`. Otros: `pnpm build`,
`pnpm lint` (solo lectura: sirve como gate), `pnpm typecheck`,
`pnpm test` (unitarios, dentro de `src/`), `pnpm test:e2e` (requiere una
Postgres de test vía `TEST_DATABASE_URL`, p. ej. `test/docker-compose` o el
servicio `pg-e2e`), `pnpm test:cov` (gate de cobertura real: 65/66/59/65).

### Frontend (`frontend/`)

```bash
pnpm install
pnpm dev             # next dev -p 3001
```

Necesita `NEXT_PUBLIC_API_URL` en el entorno (por defecto
`http://localhost:3000`); como se incrusta en el build, cualquier cambio exige
reconstruir.

### Orden de validación de una fase

`pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm test:e2e` → `pnpm build`
(en cada paquete).

## Variables de entorno

Plantillas en `.env.example` (raíz) y `frontend/.env.example`. Nunca se
commitean secretos.

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `NODE_ENV` | no | `development` / `production` |
| `PORT` | no | Puerto del backend (host: 3000) |
| `API_PREFIX` | no | Prefijo global, por defecto `api` |
| `DATABASE_URL` | sí (backend dev) | Cadena de conexión a Postgres |
| `DATABASE_URL_DOCKER` | no | Cadena del servicio `db` dentro del compose |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | no | Credenciales de `db` |
| `JWT_SECRET` | **sí** | Firma de los JWT (≥ 16 caracteres) |
| `JWT_EXPIRES_IN` | no | Vigencia del access token (por defecto `15m`) |
| `REFRESH_TOKEN_EXPIRES_IN` | no | Vigencia del refresh (por defecto `7d`) |
| `CORS_ORIGINS` | no | Orígenes permitidos, por defecto `http://localhost:3001` |
| `SWAGGER_ENABLED` | no | Habilita `/api/docs` |
| `TRUST_PROXY` | no | Número de proxies de confianza (vacío sin proxy delante) |
| `STORAGE_DRIVER` | no | `local` (dev) o `s3` (prod) |
| `STORAGE_LOCAL_PATH` | no | Ruta de adjuntos en modo local (host: `/app/uploads`) |
| `NEXT_PUBLIC_API_URL` | sí (web) | URL de la API que incrusta Next en build |
| `TEST_DATABASE_URL` | e2e | Base de test para las suites e2e |

## API

- Contrato completo (55 endpoints documentados) en [`docs/api.md`](docs/api.md);
  la fuente de verdad en tiempo de ejecución es **Swagger** en `GET /api/docs`.
- Todas las rutas (salvo auth) requieren `Authorization: Bearer <JWT>`.
- Paginación vía `?page=&limit=` con `meta` de total/páginas.
- Modelos principales (Prisma): `User`, `RefreshToken`, `PasswordResetToken`,
  `Team`, `TeamMember`, `Meeting`, `MeetingParticipant`, `AgendaItem`,
  `MeetingNote`, `Decision`, `Task`, `Attachment`, `Notification`, `AuditLog`.

## CI/CD

- **`ci.yml`** es el gate de la rama `main` y corre en cada push/PR:
  - `backend`: `prisma generate`, lint, typecheck, unit, build.
  - `frontend`: lint, typecheck, test, build.
  - `integration`: Postgres 16 real (`meetflow_test`) + `migrate deploy` + e2e.
  - `docker`: construye ambas imágenes y valida el compose.
  - `stack`: levanta el stack completo y verifica que `api` quede `healthy`
    tras aplicar migraciones.
- **`deploy.yml`** es un esqueleto **manual e inerte**: solo se dispara desde
  Actions (`workflow_dispatch`) y se salta en silencio hasta que se configuren
  las variables del entorno `production` (`ENABLE_DEPLOY=true`, `DEPLOY_HOST`,
  `DEPLOY_APP_DIR`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_SSH_KEY`).

## Estado del proyecto

Todas las fases del plan están implementadas excepto el despliegue (FASE 17,
pendiente de secretos):

```
✅ FASE 1  Infraestructura base          ✅ FASE 10 Notificaciones
✅ FASE 2  Base de datos                 ✅ FASE 11 Tiempo real (WebSockets)
✅ FASE 3  Autenticación                 ✅ FASE 12 Auditoría y búsqueda
✅ FASE 4  Usuarios y equipos            ✅ FASE 13 Archivos adjuntos
✅ FASE 5  Reuniones                     ✅ FASE 14 PWA
✅ FASE 6  Participantes y agenda        ✅ FASE 15 Asistente IA
✅ FASE 7  Notas y decisiones            ✅ FASE 16 Testing E2E integral
✅ FASE 8  Tareas y compromisos          🟡 FASE 17 CI/CD → CI lista; deploy pendiente
✅ FASE 9  Dashboard y calendario
```

La fuente de verdad de alcance, fases y convenciones es
`PLAN_INTEGRACION_MEETFLOW.md` (raíz; está en `.gitignore` y no se versiona). El
detalle de cada área vive en `docs/` (`requirements.md`, `architecture.md`,
`database.md`, `api.md`, `user-flows.md`, `development-plan.md`).

## Convenciones

- Código e identificadores en inglés; comentarios y documentación en español.
- Conventional Commits en español (`feat:`, `fix:`, `docs:`, …); commits
  granulares (migración → módulo → tests → docs).
- Fin de línea LF (`.gitattributes`); Prettier corre como plugin de ESLint en el
  backend (un problema de formato es un error de lint).
- Migraciones siempre por Prisma, nunca a mano.

## Notas Docker

- `api` y `web` corren como `USER node` (no-root), con `cap_drop: [ALL]` y
  `no-new-privileges`; sus healthchecks usan `fetch` interno desde Node.
- `db` y `migrate` bajan de root a propósito (el entrypoint de Postgres lo
  exige), por eso no llevan `cap_drop`.
- El cliente generado de Prisma se coloca dentro del store de pnpm
  (`node_modules/.pnpm/@prisma+client@…/node_modules/.prisma`), que es donde
  Node lo resuelve al hacer `require('.prisma/client/default')`. Una etapa del
  `backend/Dockerfile` lo copia ahí (usando `realpath`) y verifica en el build
  que no quede el stub (`@prisma/client did not initialize yet`), que es lo que
  tumbaba el contenedor `api` cuando runeaba con `node_modules` recién
  instalados.