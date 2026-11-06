# Arquitectura implementada — MeetFlow

Este documento resume los límites de ejecución y dependencias del sistema
actual. El inventario detallado de dominios, rutas, páginas y servicios está en
el [mapa del sistema](./system-map.md); el modelo persistido está en
[base de datos](./database.md).

## Vista general

MeetFlow se compone de dos proyectos pnpm independientes, sin workspace:

- `frontend/`: Next.js 14 con App Router, TypeScript y React Query. Renderiza las
  páginas del navegador y consume HTTP REST y Socket.IO.
- `backend/`: NestJS 10, Prisma 6 y PostgreSQL 16. Es la fuente de verdad para
  autorización y reglas de negocio.
- `docker-compose.yml`: ejecuta `db`, `migrate`, `api` y `web`. Las migraciones
  se aplican mediante `prisma migrate deploy` antes de iniciar la API.

Los contratos compartidos (enums, permisos y tipos) se mantienen duplicados en
`backend/src/shared/` y `frontend/lib/shared/`. No hay paquete compartido ni
workspace pnpm.

## Flujo de una solicitud

```mermaid
flowchart LR
  HTTP[Solicitud HTTP] --> G[Throttler y guard JWT]
  G --> AG[Guard de equipo/reunión cuando aplica]
  AG --> V[Validación DTO]
  V --> C[Controlador NestJS]
  C --> S[Servicio de dominio]
  S -->|dashboard y búsqueda: lecturas especializadas| P[PrismaService]
  S -->|dominios con persistencia aislada| R[Contrato de repositorio]
  Socket --> GW[RealtimeGateway]
  GW -->|autorización de salas| P
  R --> A[Adaptador Prisma]
  A --> P
  P --> DB[(PostgreSQL)]
  S -. evento de dominio .-> E[EventEmitter2]
  E --> L[Listeners de notificación/auditoría]
  E --> RT[RealtimeBridgeService]
```

En tiempo de ejecución el middleware asigna `X-Request-Id`; NestJS aplica el
`ThrottlerGuard`, `JwtAuthGuard`, pipe de validación, interceptor de respuesta y
filtro de excepciones globales. Los controladores reciben DTOs y usuario
actual y los servicios hacen verificaciones de negocio. La mayoría de los
dominios accede a la base mediante repositorios; dashboard y búsqueda mantienen
consultas directas para sus modelos de lectura. `RealtimeGateway` también
consulta Prisma para resolver las salas autorizadas de equipos y reuniones.
`MeetingAccessGuard` delega en `MeetingAccessService` la resolución del recurso
de reunión antes de verificar membresía y permisos. Ese servicio consulta el
contrato `MeetingsRepository`, el mismo contrato que usa `MeetingsService` y
conectado al adaptador Prisma. `MeetingAccessModule` y `MeetingsModule` registran
su propio proveedor de ese contrato; por ello comparten implementación, pero no
la misma instancia de repositorio.
Los módulos `meetings`, `teams`, `tasks`, `notes`, `decisions`, participantes y
agenda encapsulan los recursos de su dominio; `notifications`, `audit` y
`realtime` reaccionan a eventos internos cuando corresponde.

## Backend y límites de dominio

Los módulos se declaran en `backend/src/app.module.ts`. Cada módulo que usa
`PrismaService` importa `PrismaModule` de forma explícita; el proveedor de
persistencia no es global. `EventEmitterModule` se registra en el módulo raíz.
No hay message broker externo.

La consulta de membresía de equipo se concentra en `TeamsService`; guards y
servicios que requieren esa información consumen su API exportada en vez de
consultar `teamMember` directamente. `TeamsService` consume
`TeamsRepository`, conectado a `PrismaTeamsRepository` desde `TeamsModule`. El
adaptador encapsula consultas y escrituras de equipos y membresías, incluida la
transacción de creación con propietario y transferencia de propiedad. El
servicio conserva autorización por rol, validación de miembros y reglas de
transferencia, y emite los eventos de cambios de membresía.

`TeamAuthorizationService` centraliza la decisión de acceso por rol y acción.
Los guards resuelven el ámbito HTTP y delegan en ese servicio la validación de
membresía y permisos.

En identidad, `UsersService` consume `UsersRepository`, conectado a
`PrismaUsersRepository` desde `UsersModule`. El repositorio concentra la lectura,
creación y actualización de usuarios y el registro de `lastLoginAt`; el servicio
compone el nombre de entidad, comprueba cuentas activas y convierte colisiones
de claves únicas en errores de dominio HTTP.

`AuthService` consume `AuthRepository`/`PrismaAuthRepository` para leer y
persistir refresh tokens y tokens de recuperación. Los cambios del registro de
usuario y de su hash de contraseña se delegan a `UsersService`. `AuthService`
conserva las decisiones de seguridad: comparación bcrypt y hash ficticio para
evitar diferencias de tiempo que permitan enumerar cuentas, generación y hash
SHA-256 de tokens opacos, validación de expiración/revocación y detección de
reutilización por familia, consumo atómico del token de reset, invalidación de
sesiones tras cambiar/restablecer contraseña y emisión de eventos de login y
logout. Los repositorios persisten; no deciden si una credencial o token es
válido.

Los guards de autorización contextual pertenecen a los módulos de `teams` y
`meetings`; `common` conserva guards transversales como la autenticación JWT.

En el dominio de reuniones, `MeetingsService` depende del contrato
`MeetingsRepository`. `PrismaMeetingsRepository` implementa las consultas y se
inyecta desde `MeetingsModule`; las reglas de fechas, transiciones y conflictos
permanecen en el servicio. Este límite se aplica de forma selectiva, no como
una capa obligatoria para todos los módulos.

En tareas, `TasksService` consume `TasksRepository`, registrado en
`TasksModule` con `PrismaTasksRepository`. El repositorio concentra las
operaciones de persistencia y sus consultas Prisma. `TasksService` conserva las
reglas de negocio: membresía y rol del actor, pertenencia del responsable,
transiciones válidas de estado, normalización de valores de creación y emisión
de eventos de dominio. El repositorio no decide permisos ni transiciones.

En notas, `NotesService` consume `NotesRepository`, conectado a
`PrismaNotesRepository` desde `NotesModule`. El adaptador encapsula las consultas
Prisma, incluida la lectura que determina si el usuario participa en la reunión.
`NotesService` interpreta ese resultado y mantiene la regla de que solo un
participante puede crear una nota; también decide si una nota puede modificarse
o eliminarse (autor u organizador) y emite `note.created`/`note.updated` para los
listeners. El repositorio no aplica estas reglas de autorización ni publica
eventos.

El mismo límite se aplica a decisiones: `DecisionsService` conserva la regla de
participación para crear y la autoría/organización para modificar o borrar,
además de preparar el texto indexable y emitir `decision.created` y
`decision.updated`. `PrismaDecisionsRepository` concentra las consultas y
escrituras Prisma.

`AgendaService` mantiene la autorización por organizador/rol, la comprobación
del responsable de equipo y la validación de que el reordenamiento contenga
exactamente los puntos existentes. `PrismaAgendaRepository` realiza la
persistencia y ejecuta en una transacción la actualización de orden de todos los
puntos.

`ParticipantsService` conserva las reglas de gestión por organizador/rol, la
deduplicación y validación de las invitaciones, la protección del organizador y
el despacho de cambios en tiempo real. `PrismaParticipantsRepository` encapsula
las consultas y escrituras; la creación múltiple de participantes ocurre en una
transacción. La consulta de IDs que verifica que los invitados pertenecen al
equipo se delega en `TeamsService.findMemberUserIds`, para que la propiedad de
las membresías siga en el módulo de equipos. El servicio también ofrece la lista
de IDs de usuarios participantes para consumidores internos, como la generación
de notificaciones por decisiones.

En notificaciones, `NotificationsService` y `NotificationSchedulerService`
consumen `NotificationsRepository`, conectado a `PrismaNotificationsRepository`
desde `NotificationsModule`. El adaptador persiste y consulta notificaciones,
busca reuniones y tareas para los barridos y verifica duplicados por ventana.
Los servicios conservan la selección de destinatarios, la construcción de
mensajes, las ventanas de recordatorio, la idempotencia y la emisión de
`notification.created`; los listeners de eventos de dominio y menciones siguen
coordinando esos flujos.

En adjuntos, `AttachmentsService` depende de `AttachmentsRepository`, ligado a
`PrismaAttachmentsRepository` en `AttachmentsModule`. El adaptador resuelve el
`teamId` del destino (reunión, nota o tarea) y encapsula la lectura, creación y
borrado de metadatos con Prisma. `AttachmentsService` conserva la validación del
archivo y del destino, comprueba la membresía mediante `TeamsService` y coordina
la escritura o eliminación de bytes a través de `IStorageService`.

`AuditService` consume `AuditRepository`, conectado a `PrismaAuditRepository`
desde `AuditModule`. El adaptador persiste registros y aplica los filtros y el
alcance de consulta por equipos compartidos. `AuditService` conserva la
composición de los eventos de auditoría, la presentación de resultados y el
manejo tolerante a fallos: un error al registrar auditoría no interrumpe la
operación de negocio.

`AssistantService` es la fachada de autorización delante del proveedor
`IAssistantService`. Para resúmenes de reunión delega la resolución del recurso
en `MeetingAccessService` y luego comprueba membresía con `TeamsService`; para
resúmenes de tareas resuelve el equipo y verifica esa membresía con `TeamsService`.
Las sugerencias de agenda usan texto aportado por el usuario y no requieren
resolver un recurso de equipo. Los proveedores fake/Gemini no reciben el
usuario que invoca la petición.

| Área | Módulos | Límite principal |
|---|---|---|
| Identidad | `auth`, `users` | Credenciales, tokens, perfil y recuperación de cuenta. |
| Organización | `teams` | Membresías, roles y permisos asociados al equipo. |
| Reuniones | `meetings`, `participants`, `agenda`, `notes`, `decisions` | Reunión y recursos relacionados, con verificación de acceso contextual. |
| Seguimiento | `tasks`, `dashboard` | Compromisos por equipo y agregados de actividad. |
| Servicios de apoyo | `notifications`, `audit`, `search`, `attachments`, `assistant` | Avisos, registro, búsqueda, metadatos de archivos y sugerencias asistidas. |
| Operación | `realtime`, `health`, `prisma` | Canal push, comprobación de salud y acceso a persistencia. |

La tabla de rutas HTTP por módulo y los controladores concretos están en el
[mapa del sistema](./system-map.md#backend-dominios-y-módulos-nestjs).

## Frontend y acceso a datos

`frontend/app/` contiene las rutas reales del App Router. Las pantallas de la
aplicación llaman a `useRequireSession`, que obtiene el perfil con
`GET /users/me`, y se componen dentro de `AppShell`. El estado remoto se
administra con TanStack Query; las mutaciones llaman al cliente HTTP de
`frontend/lib/api/client.ts` y los resultados actualizan o invalidan la caché.

El access token se guarda en `sessionStorage`; las solicitudes mandan
`Authorization: Bearer` y `credentials: 'include'` para la cookie de refresh.
El mapa enumera las páginas existentes: no infiere rutas a partir de planes
anteriores.

## Eventos y tiempo real

Los servicios de negocio persisten mediante REST y, cuando aplica, emiten
EventEmitter2. Los listeners de notificación y auditoría escriben sus propios
registros; `RealtimeBridgeService` traduce eventos de dominio a mensajes Socket.IO.
El gateway vive en `/realtime`, valida el JWT del handshake y une el socket a
salas de usuario y equipos. El cliente puede entrar a una sala de reunión.

Socket.IO solo notifica cambios: no muta recursos ni sustituye las consultas
REST. El frontend invalida queries de React Query al recibir eventos y vuelve a
leer el estado del backend.

## Integraciones y estado real

- **PostgreSQL y Prisma:** persistencia relacional, migraciones en
  `backend/prisma/migrations/`.
- **Archivos:** el proveedor local guarda archivos en disco. `S3StorageService`
  es actualmente un stub y no conecta con AWS/S3.
- **Asistente:** la selección del proveedor contempla `GEMINI_API_KEY`, pero los
  proveedores Gemini y fake actuales devuelven resultados de muestra; la
  integración con el modelo no está implementada.
- **Inyección de integraciones:** almacenamiento y asistente usan tokens
  `Symbol` y proveedores registrados en NestJS. La configuración selecciona
  una implementación ya administrada por el contenedor.
- **Correo:** hay variables SMTP configurables, pero no existe un servicio de
  correo conectado a las operaciones.
- **CORS:** `main.ts` comparte los orígenes permitidos con el adaptador Socket.IO.

Estas limitaciones describen el código actual; las variables de entorno o
módulos configurables no implican que la integración externa esté activa.

## Configuración y ejecución

Cada proyecto mantiene su propio `.env`, derivado de su `.env.example`. La API
carga la configuración del paquete `backend/`; el frontend toma
`NEXT_PUBLIC_API_URL` durante el build. El puerto HTTP por defecto es 3000 y el
frontend local se sirve en 3001. La configuración completa y los comandos están
en el [README](../README.md).

`GET /health` comprueba la base de datos además del proceso. Swagger está en
`GET /api/docs` si `SWAGGER_ENABLED` lo permite. Los controladores no aplican un
prefijo global a las rutas REST.
