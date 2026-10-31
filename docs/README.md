# Documentación — MeetFlow

La documentación describe decisiones funcionales y el estado verificable del
código. Para rutas, módulos e integraciones actuales, parte del [mapa del
sistema](./system-map.md); para el contrato HTTP, Swagger en runtime sigue
siendo la fuente de verdad.

| Documento | Contenido |
|---|---|
| [Mapa del sistema](./system-map.md) | Módulos backend, operaciones REST, páginas frontend, integraciones y flujos entre capas actuales. |
| [Arquitectura](./architecture.md) | Límites del sistema, dependencias y comportamiento transversal. |
| [API](./api.md) | Envelopes, autenticación, validación y errores HTTP. |
| [Base de datos](./database.md) | Modelos, relaciones y búsqueda del schema Prisma actual. |
| [Requisitos](./requirements.md) | Requisitos funcionales y no funcionales del producto. |
| [Flujos de usuario](./user-flows.md) | Recorridos funcionales; incluye notas sobre pantallas o integraciones pendientes. |
| [Plan de desarrollo](./development-plan.md) | Fases, decisiones y resumen de CI. |

Los documentos de requisitos y fases conservan contexto de diseño. No implican
por sí solos que una interfaz o una integración externa esté implementada;
consulta `system-map.md` y el código enlazado para conocer el estado actual.
