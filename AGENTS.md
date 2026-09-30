# AGENTS.md — MeetFlow (meeting-management-system)

## Contexto real del repo

- Monorepo pnpm con arquitectura tradicional: `backend/` (NestJS 10, `@meetflow/backend`), `frontend/` (Next.js, `@meetflow/frontend`) y `packages/*` (tipos, config y validaciones compartidas). Ya existen FASEs 1-4 implementadas (infra, DB, auth, equipos); **nada de `apps/`**.
- `PLAN_INTEGRACION_MEETFLOW.md` (raíz) es la **fuente de verdad** de alcance, orden de fases (FASE 0 → 17) y convenciones. Léelo antes de tocar código; su §33 define reglas específicas para agentes.
- Documentación y commits del proyecto están en **español**. Escribe código/identificadores en inglés, comentarios y docs en español.
- Prisma + PostgreSQL + Docker están **en uso** (migraciones aplicadas en `backend/prisma/migrations/`). Migrar siempre por Prisma, nunca editar la DB a mano (`pnpm db:deploy` debe reconstruirla desde cero).
- Sequelize/NestJS stock `Hello World` ya no existen; la API responde con envelope `{ "data": ..., "message": ... }`.

## Comandos (desde la raíz del repo, con `--filter`)

```bash
pnpm install
pnpm dev                  # backend + frontend en paralelo (watch)
pnpm dev:api              # solo backend
pnpm build                # build -r (backend nest build + frontend next build + packages)
pnpm lint                 # lint -r (NOTA: script backend trae --fix)
pnpm typecheck            # tsc --noEmit (backend sin strict)
pnpm test                 # unit -r (SOLO spec dentro de backend/src/ y frontend/)
pnpm test:e2e             # e2e del backend (jest --config ./test/jest-e2e.json)
pnpm db:migrate --name X  # prisma migrate dev con .env
pnpm db:deploy            # prisma migrate deploy
pnpm db:generate          # prisma generate (necesario tras pnpm install)
```

- Comando único por paquete: `pnpm --filter @meetflow/backend <script>` o `@meetflow/frontend`.
- Backend: `start:dev` usa `process.env.PORT` (default 3000), carga `.env` desde la raíz vía `ConfigModule`.
- **Lint de solo lectura** del backend: `pnpm exec eslint "{src,libs,test}/**/*.ts"` dentro de `backend/` (el script `lint` mete `--fix` y modifica archivos).
- **Un solo test**: `npx jest src/...spec.ts` o `-t "..."` dentro de `backend/`; ts-jest compila en frío (30–60s por invocación), dar timeout generoso.
- Orden de validación de una fase: `lint` → `tsc --noEmit` → `test` → `test:e2e` → `build`.

## Testing

- Backend unit: `rootDir: "src"`, `testRegex: .*\.spec\.ts$`. **Los spec deben vivir en `backend/src/`, no en `backend/test/`**.
- Backend e2e: viven en `backend/test/`, regla `.e2e-spec.ts`, config aparte; `pnpm test` **no** los incluye.
- Cobertura: toda hacia `coverage/` en la raíz del repo.

## Convenciones que contradicen defaults

- **TypeScript NO es strict**: `strictNullChecks: false`, `noImplicitAny: false`, sin `strict: true`. No asumas null-safety.
- ESLint desactiva `no-explicit-any`, `explicit-function-return-type` y `explicit-module-boundary-types`. `any` y funciones sin tipo de retorno son aceptados.
- Prettier (`singleQuote`, `trailingComma: "all"`, `printWidth` 80) corre como plugin de ESLint: **un problema de formato es un error de lint**. Comando equivalente: `npx prettier --check "src/**/*.ts"` (dentro del paquete).
- `tsconfig.build.json` (backend) excluye `test/` y `**/*spec.ts` del build de producción.

## Gotchas de repositorio

- `.gitignore` existe en raíz y en `backend/`; `PLAN_INTEGRACION_MEETFLOW.md` está ignorado. No hay CI (`.github/` no existe), hooks ni `opencode.json`.
- `pnpm-workspace.yaml` = `backend`, `frontend`, `packages/*`. No crear `apps/`.
- Reset de acceso sin afectar datos: los tests e2e usan una DB de test; las migraciones de prod se aplican con `db:deploy`.
- Tras `pnpm install`, correr `pnpm db:generate` si el schema cambió.
- Docker: servicio `migrate` (`prisma migrate deploy`) y healthchecks en `docker-compose.yml`; no se ha validado un build/run completo en CI.

## Reglas del plan que mandan sobre tu criterio

- No saltar fases ni generar volúmenes de archivos sin verificar la integración ejecutando el sistema (§33, §3).
- Backend es la fuente de verdad de reglas de negocio; el frontend no las duplica.
- Respuesta API con envelope consistente `{ "data": ..., "message": ... }` (§24); errores con `{ "statusCode", "message" }` — nunca strings pelados.
- Nunca secretos en el repo: `.env` + `.env.example`. Cualquier servicio de auth asume firma JWT por env (`JWT_SECRET`).
- Git: ramas `main` / `developer` / `feature/*` y **Conventional Commits** en español (`feat:`, `fix:`, ...). Commits granulares: migración → módulo → tests.