# AGENTS.md — MeetFlow (meeting-management-system)

## Contexto real del repo

- Este repo es un **esqueleto en construcción**. `backend/` es el scaffold stock de NestJS 10 (`AppController` con `Hello World!`). No hay dominio implementado todavía.
- `PLAN_INTEGRACION_MEETFLOW.md` (raíz) es la **fuente de verdad** de alcance, orden de fases (FASE 0 → 16) y convenciones. Léelo antes de tocar código; su §33 define reglas específicas para agentes.
- Ojo: el monorepo que propone el plan (`apps/web`, `apps/api`, `packages/*`, `docker-compose.yml`) **NO existe**. No asumas `apps/api`; hoy todo vive en `backend/`.
- Documentación y commits del proyecto están en **español**. Escribe código/identificadores en inglés, comentarios y docs en español.

## Comandos (todos desde `backend/`)

No hay `package.json` raíz ni `pnpm-workspace.yaml`: hay que entrar a `backend/` para cualquier comando.

```bash
pnpm install
pnpm start:dev            # nest start --watch, puerto process.env.PORT ?? 3000
pnpm build                # nest build -> dist/ (deleteOutDir: true)
pnpm start:prod           # node dist/main — REQUiere `pnpm build` antes
pnpm test                 # unit, SOLO corre spec dentro de src/
pnpm test:e2e             # jest --config ./test/jest-e2e.json
```

- **Typecheck**: no hay script. Usar `npx tsc --noEmit -p tsconfig.json` (verificado: sale 0 y no genera `tsbuildinfo` sucio).
- **Lint**: `pnpm lint` **trae `--fix` adentro**, modifica archivos. Para un check de solo lectura: `npx eslint "{src,apps,libs,test}/**/*.ts"`.
- **Un solo test**: `npx jest src/app.controller.spec.ts`, o por nombre con `npx jest -t "should return"`. Ojo: ts-jest compila en frío y cada invocación puede tardar 30–60s; dar timeout generoso.
- Orden de validación de una fase: `lint` → `tsc --noEmit` → `test` → `test:e2e` → `build`.

## Testing

- Unit: `rootDir: "src"`, `testRegex: .*\.spec\.ts$`. **Los spec deben vivir en `src/`, no en `test/`** — un archivo fuera de ahí no lo agarra `pnpm test`.
- E2E: viven en `test/`, regla `.e2e-spec.ts`, config aparte. `pnpm test` **no** los incluye; hay que invocarlos explícitamente.
- Cobertura a `../coverage` (o sea, raíz del repo).

## Convenciones que contradicen defaults

- **TypeScript NO es strict**: `strictNullChecks: false`, `noImplicitAny: false`, sin `strict: true`. No asumas null-safety.
- ESLint desactiva explícitamente `no-explicit-any`, `explicit-function-return-type` y `explicit-module-boundary-types`. `any` y funciones sin tipo de retorno son aceptados.
- Prettier (`singleQuote`, `trailingComma: "all"`, sin `printWidth` → 80) corre como plugin de ESLint: **un problema de formato es un error de lint**. No hay script `format:check`; el comando equivalente es `npx prettier --check "src/**/*.ts"`.
- `tsconfig.build.json` excluye `test/` y `**/*spec.ts` del build de producción.

## Gotchas de repositorio

- El `.gitignore` está **solo en `backend/`**. Si creas directorios nuevos en la raíz (`apps/`, `docs/`, `node_modules/`), no hay nada que los ignore ahí.
- No hay CI (`.github/` no existe), ni hooks, ni `opencode.json`.
- `PLAN_INTEGRACION_MEETFLOW.md` está **untracked** actualmente; no des por hecho que exista en un clon limpio.
- Falta `@nestjs/config`: `main.ts` lee `process.env.PORT` directo. No des por hecho que haya carga de `.env` hasta añadirla.
- Prisma/PostgreSQL/Docker están en el plan pero **no están instalados**. Al agregarlos: migraciones siempre por Prisma, nunca editar la DB a mano (`npx prisma migrate deploy` debe reconstruirla desde cero).

## Reglas del plan que mandan sobre tu criterio

- No saltar fases ni generar volúmenes de archivos sin verificar la integración ejecutando el sistema (§33, §3).
- Backend es la fuente de verdad de reglas de negocio; el frontend no las duplica.
- Respuesta API con envelope consistente `{ "data": ..., "message": ... }` (§24) — el scaffold actual devuelve un string pelado, no lo tomes como patrón.
- Nunca secretos en el repo: `.env` + `.env.example`.
- Git: ramas `main` / `developer` / `feature/*` y **Conventional Commits** (`feat:`, `fix:`, ...). El único commit existente (`Inicializacion del backend`) no cumple esto; no lo copies como estilo.
