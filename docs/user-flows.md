# Flujos de usuario — MeetFlow

> FASE 0 · Análisis y diseño

---

## Flujo 1 — Registro e inicio de sesión

### Registro de nuevo usuario

```
[Visitante]
     │
     ▼
Accede a /register
     │
     ▼
Completa formulario (nombre, email, contraseña)
     │
     ├── Datos inválidos ──► Muestra errores inline → vuelve al formulario
     │
     ▼
POST /auth/register
     │
     ├── 409 Email duplicado ──► "Este email ya está registrado"
     │
     ▼
201 OK → Redirige a /login
     │
     ▼
Usuario inicia sesión con sus credenciales
```

### Login

```
[Visitante]
     │
     ▼
Accede a /login
     │
     ▼
Ingresa email y contraseña
     │
     ▼
POST /auth/login
     │
     ├── 401 ──► "Credenciales incorrectas" (no indica si el email existe)
     ├── 429 ──► "Demasiados intentos. Espera 1 minuto."
     │
     ▼
200 OK → JWT en memoria + Refresh Token en cookie HttpOnly
     │
     ▼
Redirige a /dashboard
```

### Recuperación de contraseña

```
[Usuario]
     │
     ▼
Accede a /forgot-password
     │
     ▼
Ingresa email → POST /auth/forgot-password
     │
     ▼
Respuesta 200 siempre (no revela si el email existe)
Mensaje: "Si el email está registrado, recibirás un enlace."
     │
     ▼
[Recibe email con enlace] → Accede a /reset-password?token=...
     │
     ▼
Ingresa nueva contraseña → POST /auth/reset-password
     │
     ├── Token inválido/expirado ──► "El enlace ha expirado. Solicita uno nuevo."
     │
     ▼
Contraseña actualizada → Redirige a /login
```

---

## Flujo 2 — Gestión de equipos

### Crear un equipo

```
[Usuario autenticado]
     │
     ▼
Dashboard → "Crear equipo"
     │
     ▼
Formulario: nombre y descripción opcional
     │
     ▼
POST /teams
     │
     ▼
Equipo creado → Usuario es OWNER automáticamente
     │
     ▼
Redirige a la página del equipo
     │
     ▼
Prompt: "¿Deseas invitar miembros ahora?"
```

### Invitar un miembro

```
[OWNER o ADMIN]
     │
     ▼
Página del equipo → "Invitar miembro"
     │
     ▼
Ingresa email del usuario a invitar
     │
     ▼
POST /teams/:id/members
     │
     ├── 404 ──► "Este email no tiene cuenta en MeetFlow"
     ├── 409 ──► "Este usuario ya es miembro del equipo"
     │
     ▼
Notificación enviada al usuario invitado
     │
     ▼
[Usuario invitado]
     │
     ▼
Recibe notificación in-app y email
     │
     ▼
Acepta → se une al equipo con rol asignado
```

---

## Flujo 3 — Ciclo de vida de una reunión

### Crear y preparar una reunión

```
[MEMBER / ADMIN / OWNER]
     │
     ▼
/meetings → "Nueva reunión"
     │
     ▼
Formulario:
  - Título (requerido)
  - Fecha y hora de inicio y fin (requerido)
  - Zona horaria (por defecto: la del usuario)
  - Equipo (requerido)
  - Descripción, ubicación, URL (opcionales)
     │
     ▼
POST /meetings
     │
     ├── endTime ≤ startTime ──► "La hora de fin debe ser posterior a la de inicio"
     ├── No pertenece al equipo ──► 403
     │
     ▼
Reunión creada en estado DRAFT
     │
     ▼
┌────────────────────────────────────┐
│ Panel de configuración de reunión  │
├──────────────┬─────────────────────┤
│ Participantes│ Agenda              │
│              │                     │
│ + Añadir     │ + Añadir punto      │
│ participante │                     │
└──────────────┴─────────────────────┘
     │
     ▼
Cambiar estado a SCHEDULED cuando esté lista
```

### Durante la reunión

```
[Organizador] cambia estado a IN_PROGRESS
     │
     ▼
Vista de reunión activa:
  - Agenda visible con puntos
  - Área de notas en tiempo real
  - Registro de decisiones
     │
     ▼
Participantes toman notas → POST /meetings/:id/notes
     │
     ▼
Se registran decisiones → POST /meetings/:id/decisions
     │
     ▼
De cada decisión se pueden crear tareas → POST /tasks
```

### Cerrar una reunión

```
[Organizador]
     │
     ▼
"Finalizar reunión" → Estado cambia a COMPLETED
     │
     ▼
Registro de asistencia real (ATTENDED / ABSENT) por participante
     │
     ▼
Resumen de la reunión:
  - Notas tomadas
  - Decisiones registradas
  - Tareas creadas
  - Asistencia
```

### Cancelar una reunión

```
[Organizador o OWNER/ADMIN]
     │
     ▼
"Cancelar reunión" (solo si está en DRAFT o SCHEDULED)
     │
     ▼
Confirmación: "¿Estás seguro? Los participantes serán notificados."
     │
     ▼
PATCH /meetings/:id → { status: "CANCELLED" }
     │
     ▼
Todos los participantes reciben notificación de cancelación
```

---

## Flujo 4 — Gestión de tareas

### Crear una tarea desde una reunión

```
[Participante de reunión]
     │
     ▼
En el panel de reunión → "Añadir tarea"
     │
     ▼
Formulario:
  - Título (requerido)
  - Responsable (miembro del equipo)
  - Prioridad (LOW / MEDIUM / HIGH / URGENT)
  - Fecha límite (opcional)
  - Descripción (opcional)
  - Decisión relacionada (opcional, autocompletado)
     │
     ▼
POST /tasks
     │
     ▼
Tarea creada → El responsable recibe notificación TASK_ASSIGNED
```

### Seguimiento de una tarea

```
[Responsable de la tarea]
     │
     ▼
Ve la tarea en /tasks o en el dashboard
     │
     ▼
Actualiza estado:
  TODO → IN_PROGRESS → DONE
  TODO → BLOCKED
  cualquier estado → CANCELLED
     │
     ▼
PATCH /tasks/:id → { status: "IN_PROGRESS" }
     │
     ▼
[Sistema — tarea vencida]
     │
     ▼
Cronjob detecta tareas con dueDate < now() y status != DONE
     │
     ▼
Notificación TASK_OVERDUE al responsable
```

---

## Flujo 5 — Dashboard y calendario

```
[Usuario autenticado]
     │
     ▼
Accede a /dashboard
     │
     ├── Panel izquierdo: Reuniones
     │     - Hoy (N reuniones)
     │     - Próximas (próximos 7 días)
     │     - Recientes
     │
     ├── Panel central: Tareas
     │     - Pendientes propias
     │     - Atrasadas propias (destacadas en rojo)
     │
     └── Panel derecho: Actividad
           - Decisiones recientes del equipo
           - Últimas acciones
     │
     ▼
Accede a /calendar
     │
     ▼
Vista mensual/semanal/diaria
     │
     ▼
Clic en una reunión → Panel lateral con resumen
     │
     ▼
"Ver detalle" → /meetings/:id
```

---

## Flujo 6 — Notificaciones

```
[Evento del sistema]
(ej. reunión actualizada)
     │
     ▼
NotificationService emite evento
     │
     ├── In-App: guarda en tabla `notifications`
     │     │
     │     ▼
     │   WebSocket push al cliente conectado
     │     │
     │     ▼
     │   Campanita actualiza contador sin recargar
     │
     └── Email: envía de forma asíncrona (no bloquea el request)

[Usuario]
     │
     ▼
Clic en campanita → Panel de notificaciones
     │
     ▼
Lista de notificaciones (no leídas primero)
     │
     ▼
Clic en notificación → Redirige al recurso relacionado
                     → Marca la notificación como leída
```

---

## Flujo 7 — Búsqueda

```
[Usuario]
     │
     ▼
Barra de búsqueda global (disponible en todas las páginas)
     │
     ▼
Escribe 2+ caracteres → GET /search?q=texto
     │
     ▼
Resultados agrupados por tipo:
  📅 Reuniones (3)
  ✅ Tareas (5)
  💡 Decisiones (2)
  📝 Notas (1)
     │
     ▼
Clic en resultado → Navega al recurso
     │
     ▼
Filtros opcionales:
  - Por equipo
  - Por fecha
  - Por estado
```

---

## Flujo 8 — Asistente inteligente (FASE 15)

```
[Usuario]
     │
     ▼
Icono de asistente → Panel lateral
     │
     ▼
"¿Qué tareas tengo pendientes esta semana?"
     │
     ▼
Backend: LLM recibe prompt + function definitions
     │
     ▼
LLM decide: llamar a getTasksForUser(userId, dueFrom, dueTo)
     │
     ▼
Backend ejecuta query con permisos del usuario actual
     │
     ▼
LLM genera respuesta en lenguaje natural con los datos
     │
     ▼
"Tienes 4 tareas pendientes esta semana:
  1. Revisar propuesta de diseño (URGENT) — vence el 17 oct
  2. ..."
     │
     ▼
[Si el usuario solicita una acción]
     │
     ▼
"Quiero cancelar la reunión del lunes"
     │
     ▼
Asistente: "¿Confirmas que deseas cancelar la reunión
            'Revisión de sprint' del lunes 20 de octubre
            a las 10:00 AM?"
     │
     ▼
Usuario: "Sí"
     │
     ▼
PATCH /meetings/:id → { status: "CANCELLED" }
     │
     ▼
"La reunión ha sido cancelada. Los participantes serán notificados."
```

---

## Resumen de rutas del frontend

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/login` | Inicio de sesión | Público |
| `/register` | Registro | Público |
| `/forgot-password` | Recuperar contraseña | Público |
| `/reset-password` | Restablecer contraseña | Público |
| `/dashboard` | Panel principal | Autenticado |
| `/calendar` | Calendario de reuniones | Autenticado |
| `/meetings` | Lista de reuniones | Autenticado |
| `/meetings/new` | Crear reunión | Autenticado |
| `/meetings/:id` | Detalle de reunión | Participante/Equipo |
| `/meetings/:id/edit` | Editar reunión | Organizador/Admin |
| `/tasks` | Lista de tareas | Autenticado |
| `/teams` | Lista de equipos | Autenticado |
| `/teams/:id` | Detalle del equipo | Miembro |
| `/teams/:id/settings` | Configuración del equipo | OWNER/ADMIN |
| `/settings` | Configuración del usuario | Autenticado |
| `/notifications` | Centro de notificaciones | Autenticado |
| `/search` | Búsqueda global | Autenticado |
