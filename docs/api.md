# Contrato de API — MeetFlow

> FASE 0 · Análisis y diseño  
> Fuente de verdad en tiempo de ejecución: Swagger en `GET /api/docs`

---

## 1. Convenciones globales

### Base URL

```
Desarrollo: http://localhost:3000
Producción: https://api.meetflow.app
```

### Autenticación

Todos los endpoints (excepto los marcados como `[público]`) requieren:

```
Authorization: Bearer <JWT>
```

### Formato de respuesta — Éxito

```json
{
  "data": <objeto o array>,
  "message": "Descripción de la operación"
}
```

### Formato de respuesta — Lista paginada

```json
{
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "message": "OK"
}
```

### Formato de respuesta — Error

```json
{
  "statusCode": 422,
  "error": "UNPROCESSABLE_ENTITY",
  "message": "Validation failed",
  "timestamp": "2026-10-15T18:20:31.004Z",
  "path": "/meetings",
  "requestId": "cbedaa0f-13ba-4b6f-a95f-9b0dfc2856bf",
  "details": [
    { "field": "endTime", "message": "endTime must be after startTime" }
  ]
}
```

| Campo | Notas |
|-------|-------|
| `error` | Nombre de la constante de `HttpStatus` (`NOT_FOUND`, `UNPROCESSABLE_ENTITY`), no el texto del catálogo HTTP |
| `timestamp`, `path`, `requestId` | Siempre presentes; `requestId` viene de la cabecera `X-Request-Id` que también devuelve la respuesta |
| `details` | Solo en errores de validación. Cada entrada es `{ field, message }`; `field` es el nombre de la propiedad (con ruta si anidada, p. ej. `agenda.0.title`) |

Un 500 nunca filtra el detalle interno: la respuesta trae `"message": "Internal server error"` y el texto real solo queda en el log del servidor.

### Query params de paginación y filtros

| Parámetro | Tipo | Ejemplo | Descripción |
|-----------|------|---------|-------------|
| `page` | number | `?page=1` | Página actual (1-based) |
| `limit` | number | `?limit=20` | Registros por página (máx. 100) |
| `sort` | string | `?sort=createdAt:desc` | Campo y dirección de ordenamiento |
| `status` | string | `?status=SCHEDULED` | Filtro por estado |
| `teamId` | string | `?teamId=abc123` | Filtro por equipo |
| `from` | ISO8601 | `?from=2026-10-01` | Fecha de inicio del rango |
| `to` | ISO8601 | `?to=2026-10-31` | Fecha de fin del rango |

---

## 2. Módulo de autenticación

### `POST /auth/register` [público]

Registra un nuevo usuario.

**Request body:**
```json
{
  "name": "Ana García",
  "email": "ana@example.com",
  "password": "SecurePass123!"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "clxxxxxxxx",
    "name": "Ana García",
    "email": "ana@example.com"
  },
  "message": "Usuario registrado correctamente"
}
```

**Errores:** `400` (datos inválidos), `409` (email ya registrado)

---

### `POST /auth/login` [público]

Inicia sesión y devuelve tokens.

**Request body:**
```json
{
  "email": "ana@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "id": "clxxxxxxxx",
      "name": "Ana García",
      "email": "ana@example.com",
      "timezone": "America/Mexico_City"
    }
  },
  "message": "Sesión iniciada correctamente"
}
```

> El Refresh Token se devuelve en cookie HttpOnly.

**Errores:** `401` (credenciales incorrectas), `429` (rate limit)

---

### `POST /auth/refresh` [público]

Renueva el JWT usando el Refresh Token en cookie.

**Response 200:**
```json
{
  "data": { "accessToken": "eyJ..." },
  "message": "Token renovado"
}
```

**Errores:** `401` (refresh token inválido o expirado)

---

### `POST /auth/logout`

Invalida el Refresh Token actual.

**Response 200:**
```json
{
  "data": null,
  "message": "Sesión cerrada correctamente"
}
```

---

### `POST /auth/forgot-password` [público]

Envía email de recuperación de contraseña.

**Request body:** `{ "email": "ana@example.com" }`

**Response 200:** (siempre 200 por seguridad, aunque el email no exista)

---

### `POST /auth/reset-password` [público]

Restablece la contraseña con el token del email.

**Request body:**
```json
{
  "token": "...",
  "password": "NuevaContraseña123!"
}
```

**Errores:** `400` (token inválido o expirado)

---

## 3. Módulo de usuarios

### `GET /users/me`

Devuelve el perfil del usuario autenticado.

**Response 200:**
```json
{
  "data": {
    "id": "clxxxxxxxx",
    "name": "Ana García",
    "email": "ana@example.com",
    "avatarUrl": "https://...",
    "timezone": "America/Mexico_City",
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "message": "OK"
}
```

---

### `PATCH /users/me`

Actualiza el perfil del usuario autenticado.

**Request body (campos opcionales):**
```json
{
  "name": "Ana García López",
  "timezone": "America/Bogota",
  "locale": "es",
  "avatarUrl": "https://cdn.meetflow.app/avatars/ana.png"
}
```

Solo se aceptan esos cuatro campos: cualquier otro en el cuerpo se rechaza con
422 y `details` diciendo el campo que sobra.

| Campo | Validación |
|-------|-----------|
| `name` | 1 a 120 caracteres |
| `timezone` | Hasta 64 caracteres. **No se comprueba que exista en la base IANA**: un valor como `Marte/Olimpico` se guarda tal cual |
| `locale` | Exactamente `es` o `en` |
| `avatarUrl` | Hasta 2048 caracteres; `null` lo limpia |

Devuelve el perfil completo actualizado.

---

### `POST /users/me/avatar`

> ⬜ **No implementado.** El campo `avatarUrl` se actualiza hoy por
> `PATCH /users/me`; la subida de archivos con `multipart/form-data` llega con
> la FASE 13 (adjuntos).

Sube o actualiza el avatar del usuario.

---

## 4. Módulo de equipos

### `GET /teams`

Lista los equipos del usuario autenticado.

---

### `POST /teams`

Crea un equipo. El creador se convierte en OWNER automáticamente.

**Request body:**
```json
{
  "name": "Equipo de Producto",
  "description": "Equipo de diseño y desarrollo de producto"
}
```

---

### `GET /teams/:teamId`

Devuelve los detalles del equipo (solo miembros).

---

### `PATCH /teams/:teamId`

Actualiza nombre/descripción (OWNER o ADMIN).

---

### `DELETE /teams/:teamId`

Elimina el equipo y todos sus recursos (solo OWNER).

---

### `GET /teams/:teamId/members`

Lista los miembros del equipo con sus roles.

---

### `POST /teams/:teamId/members`

Invita un miembro por email (OWNER o ADMIN).

**Request body:**
```json
{
  "email": "carlos@example.com",
  "role": "MEMBER"
}
```

**Errores:** `404` (usuario no registrado), `409` (ya es miembro)

---

### `PATCH /teams/:teamId/members/:userId`

Cambia el rol de un miembro (OWNER o ADMIN).

**Request body:** `{ "role": "ADMIN" }`

---

### `DELETE /teams/:teamId/members/:userId`

Elimina un miembro del equipo (OWNER o ADMIN).

---

### `POST /teams/:teamId/leave`

El usuario autenticado abandona el equipo.

**Errores:** `422` (el OWNER no puede abandonar sin transferir la propiedad)

---

## 5. Módulo de reuniones

### `GET /meetings`

Lista las reuniones del usuario autenticado.

**Query params:** `teamId`, `status`, `from`, `to`, `page`, `limit`, `sort`

---

### `POST /meetings`

Crea una reunión.

**Request body:**
```json
{
  "title": "Revisión de sprint",
  "description": "Revisión del sprint 12",
  "teamId": "clxxxxxxxx",
  "startTime": "2026-10-15T10:00:00",
  "endTime": "2026-10-15T11:00:00",
  "timezone": "America/Mexico_City",
  "location": "Sala A",
  "meetingUrl": "https://meet.google.com/abc-xyz"
}
```

**Errores:** `400` (fechas inválidas), `403` (no pertenece al equipo)

---

### `GET /meetings/:id`

Devuelve el detalle de una reunión (solo participantes o miembros del equipo).

---

### `PATCH /meetings/:id`

Actualiza los datos de una reunión (organizador o OWNER/ADMIN del equipo).

---

### `DELETE /meetings/:id`

Cancela/elimina una reunión (organizador o OWNER/ADMIN).

---

### `POST /meetings/:id/duplicate`

> ⬜ **No implementado.** Especificado en el plan, sin endpoint en el código.

Crea una copia de la reunión en estado DRAFT.

---

## 6. Módulo de participantes

### `GET /meetings/:id/participants`

Lista los participantes y sus estados.

---

### `POST /meetings/:id/participants`

Invita uno o varios participantes.

**Request body:**
```json
{
  "userIds": ["clxxxxxxxx", "clxxxxxxxy"]
}
```

---

### `PATCH /meetings/:id/participants/me`

El participante actualiza su propio estado de asistencia.

**Request body:** `{ "status": "ACCEPTED" }` (ACCEPTED | DECLINED | TENTATIVE)

---

### `PATCH /meetings/:id/participants/:userId/attendance`

El organizador registra la asistencia real al finalizar la reunión.

**Request body:** `{ "attendance": "ATTENDED" }` (ATTENDED | ABSENT)

---

### `DELETE /meetings/:id/participants/:userId`

Elimina un participante (organizador o OWNER/ADMIN).

---

## 7. Módulo de agenda

### `GET /meetings/:id/agenda`

Lista los puntos de agenda ordenados.

---

### `POST /meetings/:id/agenda`

Crea un punto de agenda.

**Request body:**
```json
{
  "title": "Demo de la nueva funcionalidad",
  "description": "...",
  "durationMinutes": 20,
  "responsibleId": "clxxxxxxxx"
}
```

---

### `PATCH /agenda/:itemId`

Actualiza un punto de agenda.

---

### `DELETE /agenda/:itemId`

Elimina un punto de agenda.

---

### `PATCH /meetings/:id/agenda/reorder`

Reordena los puntos de agenda.

**Request body:**
```json
{
  "order": ["clid1", "clid2", "clid3"]
}
```

---

## 8. Módulo de notas

### `GET /meetings/:id/notes`

Lista las notas de la reunión.

---

### `POST /meetings/:id/notes`

Crea una nota.

**Request body:** `{ "content": "Texto de la nota..." }`

---

### `PATCH /notes/:id`

Actualiza una nota (autor u organizador).

**Request body:** `{ "content": "Texto corregido @correo@ejemplo.com" }`

---

### `DELETE /notes/:id`

Elimina una nota (autor u organizador).

---

## 9. Módulo de decisiones

### `GET /meetings/:id/decisions`

Lista las decisiones de la reunión.

---

### `POST /meetings/:id/decisions`

Registra una decisión.

**Request body:**
```json
{
  "title": "Usar PostgreSQL FTS para búsqueda",
  "content": "Se decidió usar Postgres FTS por simplicidad operacional."
}
```

---

### `PATCH /decisions/:id`

Actualiza una decisión (autor u organizador). Ambos campos son opcionales y se
puede enviar solo uno.

**Request body:**
```json
{
  "title": "Usar PostgreSQL FTS para búsqueda",
  "content": "Se decidimos usar Postgres FTS."
}
```

---

### `DELETE /decisions/:id`

Elimina una decisión (autor u organizador).

---

## 10. Módulo de tareas

### `GET /tasks`

Lista las tareas del usuario autenticado.

**Query params:** `teamId`, `status`, `priority`, `assigneeId`, `meetingId`, `from`, `to`, `page`, `limit`

---

### `POST /tasks`

Crea una tarea.

**Request body:**
```json
{
  "title": "Implementar endpoint de búsqueda",
  "description": "...",
  "priority": "HIGH",
  "dueDate": "2026-10-20T23:59:00Z",
  "assigneeId": "clxxxxxxxx",
  "teamId": "clxxxxxxxx",
  "meetingId": "clxxxxxxxx",
  "decisionId": "clxxxxxxxx"
}
```

---

### `GET /tasks/:id`

Devuelve el detalle de una tarea.

---

### `PATCH /tasks/:id`

Actualiza una tarea (creador, responsable o OWNER/ADMIN del equipo).

---

### `DELETE /tasks/:id`

Elimina una tarea.

---

## 11. Módulo de notificaciones

Las notificaciones se generan de forma desacoplada: los módulos de negocio
(`meetings`, `tasks`, `decisions`, `notes`) emiten eventos de dominio y
`NotificationsService` / `MentionsListener` los escuchan vía
`@nestjs/event-emitter`. Ningún módulo de negocio depende de
`NotificationsService`.

Eventos emitidos: `meeting.created`, `meeting.updated`, `meeting.cancelled`,
`task.assigned`, `decision.created`, `decision.updated`, `note.created`,
`note.updated`.

Notificaciones dependientes del tiempo, generadas por un barrido programado
cada 5 minutos (`NotificationSchedulerService`): `MEETING_REMINDER` (60 min
antes de una reunión `SCHEDULED`), `TASK_DUE_SOON` (vence dentro de 24 h) y
`TASK_OVERDUE` (vencida con más de 24 h). Los barridos son idempotentes por
destinatario, tipo y entidad dentro de la ventana.

`MENTION` se genera al escribir `@correo@ejemplo.com` en el contenido de una
nota o el título/cuerpo de una decisión, siempre que la persona citada sea
miembro del equipo y no sea la autora. Al **editar**, solo se avisa de las
menciones nuevas: quien ya estaba citado no recibe un segundo aviso.

Las menciones se resuelven de forma asíncrona: notas y decisiones emiten un
evento de dominio y es `MentionsListener` quien genera las notificaciones. Por
eso la notificación puede aparecer un instante después de la respuesta del
endpoint, y un fallo al avisar no falla la escritura de la nota o la decisión.

### `GET /notifications`

Lista las notificaciones del usuario autenticado (máx. 50, más recientes
primero).

**Query params:** `read` (true | false)

**Respuesta 200:**

```json
{
  "data": [
    {
      "id": "clx...",
      "type": "MEETING_INVITATION",
      "title": "Nueva reunión programada",
      "body": "Se programó \"Kickoff\" en tu equipo.",
      "read": false,
      "metadata": { "meetingId": "clx..." },
      "createdAt": "2026-10-01T03:07:18.000Z",
      "updatedAt": "2026-10-01T03:07:18.000Z"
    }
  ],
  "message": "Notificaciones obtenidas correctamente"
}
```

Tipos disponibles: `MEETING_INVITATION`, `MEETING_UPDATED`,
`MEETING_CANCELLED`, `MEETING_REMINDER`, `TASK_ASSIGNED`, `TASK_DUE_SOON`,
`TASK_OVERDUE`, `MENTION`, `DECISION_CREATED`.

---

### `PATCH /notifications/:id/read`

Marca una notificación propia como leída.

**Errores:** `404` si la notificación no existe o no pertenece al usuario.

**Respuesta 200:** la notificación actualizada.

---

### `PATCH /notifications/read-all`

Marca todas las notificaciones del usuario como leídas.

**Respuesta 200:**

```json
{
  "data": { "message": "Notificaciones marcadas como leídas" },
  "message": "Notificaciones marcadas como leídas"
}
```

---

## 12. Módulo de dashboard

### `GET /dashboard`

Agrega el resumen del usuario autenticado en una sola llamada: métricas,
reuniones de hoy, próximas (7 días) y recientes, tareas pendientes y
vencidas propias, decisiones recientes del equipo y un feed de actividad
reciente.

El feed de actividad se **deriva** de las entidades existentes (reuniones,
decisiones, notas y tareas) y no introduce un modelo de auditoría propio: el
log de auditoría corresponde a FASE 12 (`GET /audit`).

Solo incluye datos de los equipos a los que pertenece el usuario.

**Respuesta 200:**

```json
{
  "data": {
    "metrics": {
      "todayMeetings": 1,
      "upcomingMeetings": 2,
      "pendingTasks": 3,
      "overdueTasks": 1
    },
    "todayMeetings": [
      {
        "id": "clx...",
        "title": "Daily",
        "startTime": "2026-10-01T15:00:00.000Z",
        "endTime": "2026-10-01T15:30:00.000Z",
        "status": "SCHEDULED",
        "team": { "id": "clx...", "name": "Producto" }
      }
    ],
    "upcomingMeetings": [],
    "recentMeetings": [],
    "pendingTasks": [
      {
        "id": "clx...",
        "title": "Redactar acta",
        "priority": "HIGH",
        "dueDate": "2026-09-28T00:00:00.000Z",
        "isOverdue": true
      }
    ],
    "overdueTasks": [
      {
        "id": "clx...",
        "title": "Redactar acta",
        "priority": "HIGH",
        "dueDate": "2026-09-28T00:00:00.000Z"
      }
    ],
    "recentDecisions": [
      {
        "id": "clx...",
        "title": "Adoptar Scrum",
        "content": "Se acuerda avanzar con Scrum.",
        "createdAt": "2026-10-01T12:00:00.000Z",
        "author": { "id": "clx...", "name": "Ana" },
        "meetingId": "clx...",
        "teamName": "Producto"
      }
    ],
    "recentActivity": [
      {
        "type": "DECISION_CREATED",
        "title": "Ana registró la decisión \"Adoptar Scrum\"",
        "occurredAt": "2026-10-01T12:00:00.000Z",
        "teamName": "Producto",
        "meetingId": "clx...",
        "actor": { "id": "clx...", "name": "Ana" }
      }
    ]
  },
  "message": "Dashboard obtenido correctamente"
}
```

Tipos de actividad: `MEETING_CREATED`, `MEETING_UPDATED`, `DECISION_CREATED`,
`NOTE_CREATED`, `TASK_CREATED`.

Las listas se limitan a 15 elementos y las decisiones cuya reunión fue
eliminada aparecen con `teamName` y `meetingId` en `null` (retención por
`SetNull`).

---

## 13. Módulo de búsqueda

### `GET /search`

Búsqueda full-text con PostgreSQL (`tsvector` + GIN, stemming en español). El
alcance son **siempre** los equipos del usuario: el índice puede alcanzar más
datos, pero la consulta filtra por pertenencia a equipo.

**Query params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `q` | string | Texto de búsqueda (mínimo 2 caracteres, requerido) |
| `type` | enum | `meetings` \| `tasks` \| `decisions` \| `notes` \| `users`. Opcional; sin él busca en las cinco |
| `teamId` | string | Limitar a un equipo |
| `userId` | string | Limitar por usuario (organizador, asignado o autor según la entidad) |
| `status` | enum | Estado de reunión o de tarea, según `type` |
| `priority` | enum | Prioridad de tarea (`LOW` \| `MEDIUM` \| `HIGH` \| `URGENT`) |
| `from` | ISO 8601 | Fecha de creación (tareas, notas, decisiones) o de inicio (reuniones) |
| `to` | ISO 8601 | Fecha de fin del rango |
| `limit` | number | Máximo de resultados por tipo (por defecto 20) |

**Ejemplo:**

```bash
GET /search?q=planificacion&type=tasks&priority=HIGH&limit=10
```

**Respuesta 200:**

```json
{
  "data": {
    "total": 3,
    "groups": {
      "tasks": [
        {
          "id": "clx...",
          "title": "Planificación del sprint",
          "description": "Detalle de la planificación",
          "status": "TODO",
          "priority": "HIGH",
          "due_date": null,
          "team_id": "clx...",
          "meeting_id": null,
          "assignee_id": "clx...",
          "rank": 0.06,
          "created_at": "2026-10-02T01:29:02.000Z"
        }
      ],
      "meetings": [],
      "decisions": [],
      "notes": [],
      "users": []
    }
  },
  "message": "Búsqueda completada"
}
```

- `total` es la suma de los grupos devueltos.
- Solo aparecen en `groups` los tipos solicitados, y dentro de cada uno los
  resultados están ordenados por `rank` descendente.
- Cada tipo trae sus propias columnas (las notas no tienen `title`, los usuarios
  no tienen `status`); los nombres de columna vienen del snake_case de la tabla.

---

## 14. Módulo de archivos adjuntos

> ⬜ **Módulo no implementado (FASE 13 pendiente).** Todo lo que sigue es la
> especificación acordada, no comportamiento existente: a día de hoy no hay
> modelo `Attachment`, ni endpoints, ni almacenamiento.

### `POST /attachments`

Sube un archivo adjunto.

**Content-Type:** `multipart/form-data`

**Campos:**
- `file`: archivo (máx. 10 MB)
- `meetingId` (opcional)
- `noteId` (opcional)
- `taskId` (opcional)

---

### `GET /attachments/:id`

Descarga o redirige al archivo.

---

### `DELETE /attachments/:id`

Elimina el registro y el archivo del almacenamiento.

---

## 15. Módulo de auditoría

### `GET /audit`

Registro de auditoría de la actividad reciente. El alcance es la actividad de
los miembros de los equipos del solicitante (incluido él mismo); la auditoría es
un dato sensible y no se expone de forma global.

Los registros los escriben los listeners de eventos de dominio, nunca la capa de
servicio de forma síncrona: un fallo de auditoría no puede tumbar la API.

**Query params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `action` | enum | Acción registrada (ver tabla de acciones) |
| `entity` | enum | `USER` \| `TEAM` \| `MEETING` \| `TASK` \| `DECISION` |
| `entityId` | string | Entidad concreta |
| `userId` | string | Actor concreto |
| `from` | ISO 8601 | Fecha de inicio |
| `to` | ISO 8601 | Fecha de fin |
| `limit` | number | Máximo de registros (por defecto 50) |
| `offset` | number | Desplazamiento para paginar |

**Acciones auditadas:**

| Acción | Origen |
|--------|--------|
| `USER_LOGIN` | `user.authenticated` |
| `USER_LOGOUT` | `user.logged_out` |
| `MEMBER_INVITED` | `team.membership.changed` |
| `MEMBER_REMOVED` | `team.membership.changed` |
| `MEETING_CREATED` | `meeting.created` |
| `MEETING_UPDATED` | `meeting.updated` |
| `MEETING_CANCELLED` | `meeting.cancelled` |
| `TASK_CREATED` | `task.changed` |
| `TASK_UPDATED` | `task.changed` |
| `TASK_COMPLETED` | `task.changed` (estado `DONE`) |
| `DECISION_CREATED` | `decision.created` |

**Respuesta 200:**

```json
{
  "data": {
    "items": [
      {
        "id": "clx...",
        "userId": "clx...",
        "user": { "id": "clx...", "name": "Ana", "email": "ana@correo.com" },
        "action": "MEETING_CREATED",
        "entity": "MEETING",
        "entityId": "clx...",
        "ipAddress": "10.0.0.1",
        "userAgent": "Mozilla/5.0",
        "metadata": { "title": "Daily", "teamId": "clx..." },
        "timestamp": "2026-10-02T01:29:02.000Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  },
  "message": "Registro de auditoría"
}
```

- `ipAddress` y `userAgent` solo se rellenan en eventos de sesión (login/logout).
- El `metadata` es variable según la acción.

---

## 16. Health check

### `GET /health` [público]

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-10-01T16:00:00Z",
  "database": "ok",
  "uptime": 3600
}
```

**Response 503** si la base de datos no responde.

---

## 17. Tiempo real (WebSockets)

Namespace: `/realtime`, protocolo Socket.IO.

REST sigue siendo la API principal para todo el CRUD. El socket solo empuja
actualizaciones: el cliente recibe el evento, invalida su query y vuelve a
pedir los datos por REST.

### Autenticación

El handshake exige el mismo JWT de REST, en `auth.token` o en el header
`Authorization: Bearer <token>`. Sin token válido o expirado el servidor
responde `error` y cierra la conexión.

```js
const socket = io('http://localhost:3000/realtime', {
  auth: { token: accessToken },
});
```

### Salas

| Sala | Contiene | Motivo |
|------|----------|--------|
| `user:<userId>` | Eventos personales del usuario | El usuario solo entra a su propia sala |
| `team:<teamId>` | Actividad de los equipos del usuario | Alta y baja de membresía en la conexión |
| `meeting:<id>` | Detalle de una reunión | Se suscribe de forma explícita |

Las salas de usuario y equipo se ingresan automáticamente tras autenticar. La
sala de reunión requiere suscripción explícita y solo se concede si la reunión
pertenece a un equipo del usuario.

### Eventos emitidos por el servidor

| Evento | Sala | Disparador |
|--------|------|-----------|
| `connected` | propia | Conexión autenticada. Envía `userId` y `teamIds` |
| `notification:new` | `user:<userId>` | Notificación creada (invitaciones, menciones, recordatorios) |
| `meeting:created` | `team:<teamId>` | Reunión creada |
| `meeting:updated` | `meeting:<id>` + `team` | Reunión editada o con cambio de estado |
| `meeting:cancelled` | `meeting:<id>` + `team` | Reunión cancelada |
| `meeting:participants:changed` | `meeting:<id>` + `team` | Invitación, respuesta, asistencia o eliminación |
| `agenda:changed` | `meeting:<id>` | Punto creado, editado, eliminado o reordenado |
| `task:changed` | `team:<teamId>` | Tarea creada, actualizada o eliminada |
| `decision:created` | `meeting:<id>` + `team` | Decisión registrada |
| `presence:changed` | `team:<teamId>` | Conexión o desconexión de un miembro del equipo |

`agenda:changed` solo se difunde al equipo cuando la reunión está `IN_PROGRESS`,
para no generar tráfico en la vista de detalle.

### Eventos recibidos del cliente

| Evento | Payload | Respuesta |
|--------|---------|-----------|
| `meeting:join` | `{ meetingId: string }` | `{ joined: boolean }` |
| `meeting:leave` | `{ meetingId: string }` | `{ left: boolean }` |

### Ejemplo

```js
socket.on('notification:new', (payload) => {
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
});

socket.on('meeting:updated', ({ meetingId }) => {
  queryClient.invalidateQueries({ queryKey: ['meetings'] });
});

socket.emit('meeting:join', { meetingId });
```

---

## 18. Resumen de endpoints por módulo

| Módulo | Endpoints |
|--------|-----------|
| Raíz | 1 |
| Auth | 6 |
| Users | 2 |
| Teams | 10 |
| Meetings | 5 |
| Participants | 5 |
| Agenda | 5 |
| Notes | 4 |
| Decisions | 4 |
| Tasks | 5 |
| Notifications | 3 |
| Dashboard | 1 |
| Search | 1 |
| Audit | 1 |
| Health | 1 |
| **Total implementado** | **54** |

Especificados pero **no implementados** (no cuentan para el total):

| Endpoint | Estado |
|----------|--------|
| `POST /attachments`, `GET /attachments/:id`, `DELETE /attachments/:id` | FASE 13 pendiente |
| `POST /users/me/avatar` | FASE 13 pendiente (`avatarUrl` se cambia por `PATCH /users/me`) |
| `POST /meetings/:id/duplicate` | Fuera del alcance actual |
