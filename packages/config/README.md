# @meetflow/config

Constantes compartidas entre `apps/web` y `apps/api`.

## Contenido

| Archivo | Qué define |
|---------|------------|
| `constants.ts` | Paginación, límites de auth, longitudes, transiciones de estado, tamaño/tipos de archivo permitidos |
| `permissions.ts` | Matriz de permisos por rol de equipo (§10 del plan) y helper `roleCan` |

## Regla importante

El backend sigue siendo la fuente de verdad: el guard de autorización lee esta
matriz, pero nunca la modifica en runtime. El frontend la usa solo para
deshabilitar acciones en la UI, nunca para decidir permisos reales.
