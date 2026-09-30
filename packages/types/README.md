# @meetflow/types

Tipos, enums y contratos compartidos entre `apps/web` y `apps/api`.

## Convenciones

- Los enums se declaran como `const` objects + tipo unión derivado, no como
  `enum` de TypeScript. Así son estructuralmente compatibles con los enums que
  genera Prisma y no hay que hacer casts en el backend.
- El backend sigue siendo la fuente de verdad de las reglas de negocio; aquí
  solo viven formas de datos (contratos), nunca lógica.

## Qué debe contener este paquete

| Contenido | Fase |
|-----------|------|
| Enums de dominio (`MeetingStatus`, `TaskStatus`, …) | FASE 1 |
| Envelopes de respuesta (`ApiSuccessResponse`, `ApiPaginatedResponse`) | FASE 1 |
| Interfaces de entidades (`User`, `Meeting`, `Task`, …) | Fase donde nazca la entidad |

## Comandos

```bash
pnpm --filter @meetflow/types build
pnpm --filter @meetflow/types typecheck
```
