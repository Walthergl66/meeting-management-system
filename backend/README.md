# meetflow-backend

API NestJS 10 de **MeetFlow** (sistema de gestión de reuniones). Es la fuente
de verdad de las reglas de negocio; el frontend no las duplica.

Documentación general del proyecto en el [`README.md`](../README.md) de la raíz.

## Stack

- NestJS 10 + TypeScript
- Prisma 6 + PostgreSQL 16 (schema y migraciones en `prisma/`)
- JWT (15 min) + refresh token (7 días) hasheado en DB
- WebSocket (Socket.IO) bajo `/realtime`
- Swagger en `GET /api/docs`
- Envelope de respuesta `{ data, message }`; errores `{ statusCode, error, message, timestamp, path, requestId, details }`

## Módulos

`auth`, `users`, `teams`, `meetings`, `participants`, `agenda`, `notes`,
`decisions`, `tasks`, `dashboard`, `notifications`, `realtime`, `audit`,
`search`, `attachments`, `assistant`.

## Comandos

Instalar siempre **dentro** de este paquete, no en la raíz del repo:

```bash
cp .env.example .env             # el entorno del backend vive en backend/.env
pnpm install
pnpm db:generate                 # prisma generate (tras instalar o si cambió el schema)
pnpm db:migrate -n <nombre>      # crear y aplicar una migración
pnpm db:deploy                   # aplicar migraciones sin generar (producción)
pnpm db:reset                    # resetear la base
pnpm dev                         # nest start --watch (puerto 3000, lee backend/.env)
pnpm lint                        # eslint sin --fix: gate de CI
pnpm typecheck                   # tsc --noEmit
pnpm test                        # unitarios (dentro de src/, *_spec.ts)
pnpm test:e2e                    # suites e2e (backend/test/, requiere Postgres de test)
pnpm test:cov                    # cobertura (umbral 65/66/59/65)
pnpm build                       # nest build
```

Los scripts `db:*` cargan este `.env` del paquete con `dotenv -e .env`.

## Variables de entorno

Este proyecto tiene **su propio** `.env` (nada en la raíz del repo): parte de
`.env.example` y detalle en el README de la raíz. El compose lo consume con
`docker compose --env-file backend/.env` desde la raíz.
`JWT_SECRET` es obligatorio (≥ 16 caracteres).