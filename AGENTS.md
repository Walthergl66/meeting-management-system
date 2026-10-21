# AGENTS.md — MeetFlow (meeting-management-system)

## Contexto real del repo

- **Dos proyectos pnpm independientes, sin monorepo**: `backend/` (NestJS 10, paquete `meetflow-backend`) y `frontend/` (Next.js 14, paquete `meetflow-frontend`). No hay `package.json` raíz, ni `pnpm-workspace.yaml`, ni lockfile raíz, ni `packages/`: **no los reintroduzcas**. Cada proyecto tiene su propio `pnpm-lock.yaml`, su `node_modules` y **su propio `.env`** (`backend/.env`, `frontend/.env`; copia los `.env.example` de cada carpeta). **No hay `.env` en la raíz**: cada proyecto manda en su carpeta.
- El código compartido (enums, constantes, permisos, tipos API y validaciones) está **duplicado a propósito**: `backend/src/shared/` y `frontend/lib/shared/`. No crear un tercer paquete ni dependencias `workspace:*`.
- FASEs 1-16 implementadas; FASE 17 solo tiene CI (el deploy manual sigue pendiente de secretos). **Nada de `apps/`**.
- `PLAN_INTEGRACION_MEETFLOW.md` (raíz) es la **fuente de verdad** de alcance, orden de fases (FASE 0 → 17) y convenciones; su §33 regula específicamente a los agentes. **Está en `.gitignore` y no se versiona: puede que no exista en tu checkout** (en este no está). Si falta, usa `README.md` + `docs/` (`docs/development-plan.md` replica el índice de fases).
- Documentación y commits en **español**; código e identificadores en inglés.
- Prisma + PostgreSQL + Docker en uso (migraciones versionadas en `backend/prisma/migrations/`). Migrar siempre por Prisma, nunca a mano.
- Envelope de respuesta: `{ "data": ..., "message": ... }` en éxito; `{ statusCode, error, message, timestamp, path, requestId, details }` en error. Swagger (fuente de verdad en runtime) en `GET /api/docs`.

## Comandos (sin comandos raíz: se ejecuta dentro de cada proyecto)

```bash
# backend/  (package.json: meetflow-backend)
cp .env.example .env     # el .env del backend vive aquí, no en la raíz
pnpm install
pnpm db:generate          # prisma generate (necesario tras pnpm install)
pnpm dev                  # nest start --watch, puerto 3000 — lee backend/.env
pnpm build                # nest build
pnpm lint                 # eslint sin --fix: no modifica archivos
pnpm lint:fix
pnpm typecheck            # tsc --noEmit (backend sin strict)
pnpm test                 # unit (SOLO specs dentro de backend/src/)
pnpm test:cov             # unit + gate de cobertura (es lo que corre CI)
pnpm test:e2e             # jest --config ./test/jest-e2e.json --runInBand (ver Testing)
pnpm db:migrate --name X  # prisma migrate dev
pnpm db:deploy            # prisma migrate deploy
pnpm db:reset             # prisma migrate reset

# frontend/  (package.json: meetflow-frontend)
cp .env.example .env     # NEXT_PUBLIC_API_URL (se incrusta en el build)
pnpm install
pnpm dev                  # next dev -p 3001
pnpm build                # next build
pnpm lint                 # next lint (sin --fix)
pnpm typecheck            # tsc --noEmit
pnpm test                 # vitest run (tests/**/*.test.ts, entorno node)

# raíz — solo para el stack Docker (el compose toma el env del backend)
docker compose --env-file backend/.env up -d --build
```

- Para correr ambos, usa dos terminals; no hay script raíz que los orqueste.
- pnpm fijado por proyecto con `"packageManager": "pnpm@10.34.5"`; si corepack resuelve otra versión, borra `~/.cache/node/corepack` y reinstala.
- **Un `.env` por proyecto, sin archivo raíz**: el backend lee `backend/.env` (resuelto subiendo por `package.json` desde `src/app.module.ts`, así que `pnpm dev` funciona con cualquier directorio de trabajo) y los scripts `db:*` usan `dotenv -e .env` (dentro de `backend/`); el frontend lee `frontend/.env` con `NEXT_PUBLIC_API_URL`. El stack Docker (y `deploy.yml`) se lanza con `--env-file backend/.env`.
- **`EMAIL_FROM` vacío o con TLD real**: con joi 18, un valor como `noreply@meetflow.local` no valida (`"EMAIL_FROM" must be a valid email`) y aborta el arranque; el template deja la variable vacía a propósito. Además, `dotenv -e` **ignora en silencio** el archivo si no existe, así que sin `backend/.env` los scripts `db:*` fallan después por falta de `DATABASE_URL` sin decir por qué.
- **Lint de solo lectura** en ambos proyectos (`pnpm lint` sin `--fix`: sirve como gate de CI); para corregir, `pnpm lint:fix`.
- **Fin de línea = LF, y `.gitattributes` lo fija.** Prettier corre como plugin de ESLint solo en `backend/`, así que un CRLF en el working tree sale como miles de errores `Delete ␍` y tumba el gate en Windows. Remedio en un clon anterior al archivo: `pnpm exec prettier --write "src/**/*.ts" "test/**/*.ts"` dentro de `backend/`.
- **Un solo test**: `pnpm exec jest src/ruta/spec.ts` o `-t "..."` dentro de `backend/` (verificado). Si ts-jest recompila en frío, la primera invocación tarda bastante más.
- Orden de validación de una fase: `lint` → `typecheck` → `test` → `test:e2e` → `build` (en cada paquete).

## Testing

- Backend unit: `rootDir: "src"`, `testRegex: .*\.spec.ts$`. **Los spec deben vivir en `backend/src/`, no en `backend/test/`**.
- Backend e2e: viven en `backend/test/`, `testRegex: .e2e-spec.ts$`, config aparte; `pnpm test` **no** los incluye.
  - **No aplican migraciones**: aplica antes contra la base de test (`DATABASE_URL=<url-de-test> pnpm exec prisma migrate deploy`).
  - `setup-e2e.ts` **aborta si `TEST_DATABASE_URL` no contiene `test` en el nombre de la base** (protección dura contra pisar la base de desarrollo). Sin `TEST_DATABASE_URL` se cae a `DATABASE_URL` con warning y el teardown no limpia nada.
  - `global-teardown.ts` trunca todas las tablas al terminar (solo si `TEST_DATABASE_URL` estaba definida).
  - No existe compose de test ni servicio `pg-e2e` (el README los menciona, pero no están en el repo): usa cualquier Postgres 16 accesible (en CI es el servicio `postgres` con base `meetflow_test`).
- Frontend: Vitest, `tests/**/*.test.ts`, entorno `node` (sin jsdom: un test que necesite DOM no pasaría).
- Cobertura: `backend/coverage/` (`coverageDirectory: "../coverage"` es relativo a `rootDir: src`). Umbral global en `package.json`: **65/66/59/65** (statements/branches/functions/lines). Son el **suelo real medido**: CI corre `pnpm test:cov`, así que no puede retroceder. Sube el ratchet al cubrir módulos sin test (`attachments`, `assistant`, `storage` y `config` ya tienen specs).
- Ojo al leer el porcentaje: los controladores y presenters salen en 0% porque los unitarios no los tocan (los e2e sí los ejercitan); la cifra mide solo la capa unitaria.

## Convenciones que contradicen defaults

- **TypeScript NO es strict**: `strictNullChecks: false`, `noImplicitAny: false`, sin `strict: true`. No asumas null-safety.
- ESLint desactiva `no-explicit-any`, `explicit-function-return-type` y `explicit-module-boundary-types`: `any` y funciones sin tipo de retorno son aceptados.
- Prettier (`singleQuote`, `trailingComma: "all"`, `printWidth` 80) corre como plugin de ESLint solo en backend: **un problema de formato es un error de lint**. Comprobación: `pnpm exec prettier --check "src/**/*.ts"` (dentro del paquete; nunca `npx`).
- `tsconfig.build.json` (backend) excluye `test/` y `**/*spec.ts` del build de producción.

## Gotchas de repositorio

- CI (`.github/workflows/ci.yml`) tiene 5 jobs: `backend` (corre `test:cov`), `frontend`, `integration` (e2e contra Postgres 16 real), `docker` (build de ambos Dockerfiles + `docker compose config` + grep anti-regresión de la ruta `/repo/backend`) y `stack` (levanta el compose completo y espera los healthchecks de `api` y `web`): imágenes y arranque real sí se validan en CI. `deploy.yml` es un esqueleto manual inerte: se salta mientras `vars.ENABLE_DEPLOY != 'true'` en el entorno `production`.
- No hay hooks de git; `opencode.json` está en `.gitignore`.
- No existe `pnpm-workspace.yaml`: instalar siempre **dentro** de `backend/` o `frontend/`, nunca en la raíz. El `.npmrc` de la raíz (`auto-install-peers`, `strict-peer-dependencies=false`) no aplica al instalar por proyecto.
- Docker: el servicio `migrate` ejecuta `prisma migrate deploy` con `WORKDIR /repo/backend` y `api` depende de él con `service_completed_successfully`; healthchecks en `db`, `api` y `web`; ambos Dockerfiles instalan **solo su propio** lockfile y terminan en `USER node`. El compose se lanza desde la raíz con `--env-file backend/.env` (no hay `.env` raíz que interpolar) y el CI hace lo mismo con `--env-file .env.ci` (ese archivo sí está versionado, es el único).
- Tras `pnpm install` en backend, correr `pnpm db:generate` si el schema cambió.
- `PLAN_INTEGRACION_MEETFLOW.md` está gitignorado y `.env` también (en `backend/` y `frontend/`): nunca se commitean.

## Reglas del plan que mandan sobre tu criterio

- No saltar fases ni generar volúmenes de archivos sin verificar la integración ejecutando el sistema (§33, §3; si el plan no está en tu checkout, aplica el espíritu: ejecuta y verifica lo que cambies).
- Backend es la fuente de verdad de reglas de negocio; el frontend no las duplica.
- Respuesta API con envelope consistente `{ "data": ..., "message": ... }` (§24); errores con `{ statusCode, message }` — nunca strings pelados.
- Nunca secretos en el repo: `.env` + `.env.example`. Cualquier servicio de auth asume firma JWT por env (`JWT_SECRET`).
- Git: el plan prescribe `main` / `developer` / `feature/*`; en la práctica `main` ya absorbió todas las ramas `feature/fase-N-*` y `dev-frontend` (compruébalo con `git merge-base --is-ancestor <rama> main`) y `origin` mantiene abiertas muchas ramas `dependabot/*`. **Conventional Commits** en español (`feat:`, `fix:`, ...). Commits granulares: migración → módulo → tests → docs.
