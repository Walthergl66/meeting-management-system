# AGENTS.md — MeetFlow (meeting-management-system)

## Contexto real del repo

- **Dos proyectos pnpm independientes, sin monorepo**: `backend/` (NestJS 10, paquete `meetflow-backend`) y `frontend/` (Next.js, paquete `meetflow-frontend`). No hay `package.json` raíz, ni `pnpm-workspace.yaml`, ni lockfile raíz, ni `packages/`: **no los reintroduzcas**. Cada proyecto tiene su propio `pnpm-lock.yaml` y su `node_modules`.
- El código compartido (enums, constantes, permisos, tipos API y validaciones) está **duplicado a propósito**: `backend/src/shared/` y `frontend/lib/shared/`. No crear un tercer paquete ni dependencias `workspace:*`.
- Ya existen FASEs 1-11 implementadas (infra, DB, auth, equipos, ..., notificaciones y WebSocket); **nada de `apps/`**.
- `PLAN_INTEGRACION_MEETFLOW.md` (raíz) es la **fuente de verdad** de alcance, orden de fases (FASE 0 → 17) y convenciones. Léelo antes de tocar código; su §33 define reglas específicas para agentes.
- Documentación y commits del proyecto están en **español**. Escribe código/identificadores en inglés, comentarios y docs en español.
- Prisma + PostgreSQL + Docker están **en uso** (migraciones aplicadas en `backend/prisma/migrations/`). Migrar siempre por Prisma, nunca editar la DB a mano (`pnpm db:deploy` debe reconstruirla desde cero).
- Sequelize/NestJS stock `Hello World` ya no existen; la API responde con envelope `{ "data": ..., "message": ... }`.

## Comandos (sin comandos raíz: se ejecuta dentro de cada proyecto)

```bash
# backend/  (package.json: meetflow-backend)
pnpm install
pnpm dev                  # nest start --watch
pnpm build                # nest build
pnpm lint                 # eslint sin --fix: no modifica archivos
pnpm typecheck            # tsc --noEmit (backend sin strict)
pnpm test                 # unit (SOLO spec dentro de backend/src/)
pnpm test:e2e             # jest --config ./test/jest-e2e.json
pnpm db:generate          # prisma generate (necesario tras pnpm install)
pnpm db:migrate --name X  # prisma migrate dev
pnpm db:deploy            # prisma migrate deploy
pnpm db:reset             # prisma migrate reset

# frontend/  (package.json: meetflow-frontend)
pnpm install
pnpm dev                  # next dev -p 3001
pnpm build                # next build
pnpm lint                 # next lint
pnpm typecheck            # tsc --noEmit
pnpm test                 # hoy es un echo: el frontend aún no tiene tests
```

- Para ambos a la vez, usa dos terminals; no hay script raíz que los orqueste.
- pnpm está fijado por proyecto con `"packageManager": "pnpm@10.34.5"`; si corepack resuelve otra versión, borra `~/.cache/node/corepack` y reinstala.
- Backend: `start:dev` usa `process.env.PORT` (default 3000), carga `.env` desde la raíz vía `ConfigModule`; los scripts `db:*` usan `dotenv -e ../.env`.
- **Lint de solo lectura** en ambos proyectos: `pnpm lint` no lleva `--fix` en ninguno, así que sirve como gate de CI. Para corregir, `pnpm lint:fix` (o `pnpm exec eslint "{src,apps,libs,test}/**/*.ts" --fix` dentro de `backend/`).
- **Un solo test**: `pnpm exec jest src/...spec.ts` o `-t "..."` dentro de `backend/`; ts-jest compila en frío (30–60s por invocación), dar timeout generoso.
- Orden de validación de una fase: `lint` → `tsc --noEmit` → `test` → `test:e2e` → `build`.

## Testing

- Backend unit: `rootDir: "src"`, `testRegex: .*\.spec\.ts$`. **Los spec deben vivir en `backend/src/`, no en `backend/test/`**.
- Backend e2e: viven en `backend/test/`, regla `.e2e-spec.ts`, config aparte; `pnpm test` **no** los incluye.
- Cobertura: toda hacia `coverage/` en la raíz del repo.

## Convenciones que contradicen defaults

- **TypeScript NO es strict**: `strictNullChecks: false`, `noImplicitAny: false`, sin `strict: true`. No asumas null-safety.
- ESLint desactiva `no-explicit-any`, `explicit-function-return-type` y `explicit-module-boundary-types`. `any` y funciones sin tipo de retorno son aceptados.
- Prettier (`singleQuote`, `trailingComma: "all"`, `printWidth` 80) corre como plugin de ESLint: **un problema de formato es un error de lint**. Comando equivalente: `pnpm exec prettier --check "src/**/*.ts"` (dentro del paquete; nunca `npx`).
- `tsconfig.build.json` (backend) excluye `test/` y `**/*spec.ts` del build de producción.

## Gotchas de repositorio

- `.gitignore` existe en raíz y en `backend/`; `PLAN_INTEGRACION_MEETFLOW.md` está ignorado. No hay CI (`.github/` no existe), hooks ni `opencode.json`.
- No existe `pnpm-workspace.yaml`: instalar siempre **dentro** de `backend/` o `frontend/`, nunca en la raíz.
- El `.npmrc` de la raíz ya no aplica al instalar por proyecto; si un proyecto necesita ajustes, créale su propio `.npmrc`.
- Reset de acceso sin afectar datos: los tests e2e usan una DB de test; las migraciones de prod se aplican con `db:deploy`.
- Tras `pnpm install`, correr `pnpm db:generate` si el schema cambió.
- Docker: servicio `migrate` (`prisma migrate deploy`) y healthchecks en `docker-compose.yml`; los `Dockerfile` de backend y frontend instalan **solo su propio** lockfile. No se ha validado un build/run completo en CI.

## Reglas del plan que mandan sobre tu criterio

- No saltar fases ni generar volúmenes de archivos sin verificar la integración ejecutando el sistema (§33, §3).
- Backend es la fuente de verdad de reglas de negocio; el frontend no las duplica.
- Respuesta API con envelope consistente `{ "data": ..., "message": ... }` (§24); errores con `{ "statusCode", "message" }` — nunca strings pelados.
- Nunca secretos en el repo: `.env` + `.env.example`. Cualquier servicio de auth asume firma JWT por env (`JWT_SECRET`).
- Git: el plan prescribe `main` / `developer` / `feature/*`, pero en la práctica el repo solo ha usado `main` + `feature/fase-N-*` (10 ramas, todas ancestros lineales entre sí; `main` aún no las ha absorbido). **Conventional Commits** en español (`feat:`, `fix:`, ...). Commits granulares: migración → módulo → tests → docs.