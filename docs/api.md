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
  "error": "Unprocessable Entity",
  "message": "Validation failed",
  "details": [
    { "field": "endTime", "message": "endTime must be after startTime" }
  ]
}
```

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
  "timezone": "America/Bogota"
}
```

---

### `POST /users/me/avatar`

Sube o actualiza el avatar del usuario.

**Content-Type:** `multipart/form-data`  
**Campo:** `file` (imagen, máx. 2 MB)

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

Actualiza una decisión (autor u organizador).

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

### `GET /notifications`

Lista las notificaciones del usuario autenticado.

**Query params:** `read` (true | false), `page`, `limit`

---

### `PATCH /notifications/:id/read`

Marca una notificación como leída.

---

### `PATCH /notifications/read-all`

Marca todas las notificaciones del usuario como leídas.

---

## 12. Módulo de búsqueda

### `GET /search`

Busca en todas las entidades accesibles al usuario.

**Query params:**

| Param | Descripción |
|-------|-------------|
| `q` | Texto de búsqueda (mínimo 2 caracteres) |
| `type` | `meetings` \| `tasks` \| `decisions` \| `notes` \| `users` |
| `teamId` | Limitar al equipo |
| `from` | Fecha de inicio |
| `to` | Fecha de fin |
| `status` | Filtro de estado |

---

## 13. Módulo de archivos adjuntos

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

## 14. Módulo de auditoría

### `GET /audit`

Lista el log de auditoría del equipo (solo OWNER o ADMIN).

**Query params:** `teamId`, `action`, `userId`, `from`, `to`, `page`, `limit`

---

## 15. Health check

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

## 16. Resumen de endpoints por módulo

| Módulo | Endpoints |
|--------|-----------|
| Auth | 6 |
| Users | 3 |
| Teams | 8 |
| Meetings | 6 |
| Participants | 5 |
| Agenda | 5 |
| Notes | 4 |
| Decisions | 4 |
| Tasks | 5 |
| Notifications | 3 |
| Search | 1 |
| Attachments | 3 |
| Audit | 1 |
| Health | 1 |
| **Total** | **55** |
