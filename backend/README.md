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
pnpm install
pnpm db:generate                 # prisma generate (tras instalar o si cambió el schema)
pnpm db:migrate -n <nombre>      # crear y aplicar una migración
pnpm db:deploy                   # aplicar migraciones sin generar (producción)
pnpm db:reset                    # resetear la base
pnpm dev                         # nest start --watch (puerto 3000, .env en la raíz)
pnpm lint                        # eslint sin --fix: gate de CI
pnpm typecheck                   # tsc --noEmit
pnpm test                        # unitarios (dentro de src/, *_spec.ts)
pnpm test:e2e                    # suites e2e (backend/test/, requiere Postgres de test)
pnpm test:cov                    # cobertura (umbral 65/66/59/65)
pnpm build                       # nest build
```

Los scripts `db:*` cargan el `.env` de la raíz con `dotenv -e ../.env`.

## Variables de entorno

Ver plantillas en `.env.example` (raíz) y detalle en el README de la raíz.
`JWT_SECRET` es obligatorio (≥ 16 caracteres).