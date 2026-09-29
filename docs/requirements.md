# Requisitos — MeetFlow

> FASE 0 · Análisis y diseño

---

## 1. Actores del sistema

| Actor | Descripción |
|-------|-------------|
| **Visitante** | Usuario no autenticado. Solo puede acceder a las páginas públicas (login, registro, recuperación de contraseña). |
| **Usuario autenticado** | Ha iniciado sesión. Puede crear y pertenecer a equipos, gestionar reuniones según su rol. |
| **OWNER** | Creador del equipo. Control total sobre el equipo y sus recursos. |
| **ADMIN** | Administrador del equipo. Puede gestionar miembros y reuniones pero no eliminar el equipo. |
| **MEMBER** | Miembro regular. Puede crear reuniones y participar en las del equipo. |
| **GUEST** | Invitado puntual. Solo puede ver las reuniones a las que fue invitado explícitamente. |
| **Sistema** | Proceso automatizado que genera notificaciones, detecta tareas vencidas y registra auditoría. |

---

## 2. Requisitos funcionales

### RF-01 — Autenticación

| ID | Requisito |
|----|-----------|
| RF-01.1 | Un visitante puede registrarse con nombre, email y contraseña. |
| RF-01.2 | Un visitante puede iniciar sesión con email y contraseña. |
| RF-01.3 | El sistema emite un JWT de corta duración y un Refresh Token de larga duración. |
| RF-01.4 | Un usuario autenticado puede renovar su JWT usando el Refresh Token. |
| RF-01.5 | Un usuario autenticado puede cerrar sesión, invalidando el Refresh Token. |
| RF-01.6 | Un usuario puede solicitar recuperación de contraseña por email. |
| RF-01.7 | Un usuario puede restablecer su contraseña usando el enlace enviado por email. |
| RF-01.8 | Las rutas protegidas rechazan peticiones sin JWT válido con HTTP 401. |

### RF-02 — Perfil de usuario

| ID | Requisito |
|----|-----------|
| RF-02.1 | Un usuario puede ver y editar su nombre. |
| RF-02.2 | Un usuario puede subir o cambiar su avatar. |
| RF-02.3 | Un usuario puede configurar su zona horaria (formato IANA, ej. `America/Mexico_City`). |
| RF-02.4 | Un usuario puede ver su perfil público desde otros módulos. |

### RF-03 — Equipos

| ID | Requisito |
|----|-----------|
| RF-03.1 | Un usuario autenticado puede crear un equipo. Al crearlo, se convierte en OWNER. |
| RF-03.2 | Un OWNER o ADMIN puede editar nombre y descripción del equipo. |
| RF-03.3 | Un OWNER o ADMIN puede invitar miembros por email. |
| RF-03.4 | El usuario invitado recibe una notificación y puede aceptar o rechazar la invitación. |
| RF-03.5 | Un OWNER o ADMIN puede cambiar el rol de un miembro (excepto su propio rol). |
| RF-03.6 | Un OWNER o ADMIN puede eliminar un miembro del equipo. |
| RF-03.7 | Un MEMBER o GUEST puede abandonar el equipo voluntariamente. |
| RF-03.8 | Un OWNER puede transferir la propiedad del equipo a otro ADMIN. |
| RF-03.9 | Un OWNER puede eliminar el equipo. |
| RF-03.10 | Un usuario solo puede ver los equipos a los que pertenece. |

### RF-04 — Reuniones

| ID | Requisito |
|----|-----------|
| RF-04.1 | Un OWNER, ADMIN o MEMBER puede crear una reunión dentro de un equipo. |
| RF-04.2 | La reunión debe tener: título, fecha/hora de inicio y fin, zona horaria y estado. |
| RF-04.3 | La reunión puede tener: descripción, ubicación y URL de videollamada. |
| RF-04.4 | Un usuario puede editar una reunión que organizó, o si tiene rol OWNER/ADMIN en el equipo. |
| RF-04.5 | Una reunión puede cancelarse si está en estado DRAFT o SCHEDULED. |
| RF-04.6 | Una reunión puede reprogramarse (cambiar fecha/hora) si está en estado DRAFT o SCHEDULED. |
| RF-04.7 | Una reunión puede duplicarse, creando una copia en estado DRAFT. |
| RF-04.8 | Un usuario puede listar las reuniones de sus equipos con filtros por fecha, estado y equipo. |
| RF-04.9 | El sistema valida que `endTime` > `startTime`. |
| RF-04.10 | El sistema valida que el organizador pertenece al equipo. |

### RF-05 — Participantes

| ID | Requisito |
|----|-----------|
| RF-05.1 | El organizador puede invitar participantes a una reunión. |
| RF-05.2 | Los participantes pueden ser miembros del equipo o usuarios externos con invitación. |
| RF-05.3 | Un participante puede aceptar, declinar o marcar como tentativa su asistencia. |
| RF-05.4 | Al finalizar la reunión, el organizador puede marcar la asistencia real (ATTENDED / ABSENT). |
| RF-05.5 | Un participante puede ver la lista de otros participantes y sus estados. |

### RF-06 — Agenda

| ID | Requisito |
|----|-----------|
| RF-06.1 | El organizador puede añadir puntos de agenda a una reunión. |
| RF-06.2 | Cada punto tiene: título, descripción opcional, duración estimada y responsable opcional. |
| RF-06.3 | Los puntos pueden reordenarse manualmente. |
| RF-06.4 | Los puntos pueden editarse o eliminarse antes de que comience la reunión. |
| RF-06.5 | Los participantes pueden ver la agenda antes de la reunión. |

### RF-07 — Notas y decisiones

| ID | Requisito |
|----|-----------|
| RF-07.1 | Los participantes de una reunión pueden crear notas durante o después de la reunión. |
| RF-07.2 | Una nota tiene: contenido de texto y referencia al autor. |
| RF-07.3 | El organizador o el autor puede editar o eliminar una nota. |
| RF-07.4 | Los participantes de una reunión pueden registrar decisiones formales. |
| RF-07.5 | Una decisión tiene: título, descripción y referencia al autor. |
| RF-07.6 | Eliminar una reunión no elimina sus notas ni decisiones (retención de evidencia). |

### RF-08 — Tareas

| ID | Requisito |
|----|-----------|
| RF-08.1 | Cualquier participante puede crear tareas asociadas a una reunión o decisión. |
| RF-08.2 | Una tarea tiene: título, descripción, prioridad, estado, fecha límite y responsable. |
| RF-08.3 | El responsable o el creador pueden cambiar el estado de la tarea. |
| RF-08.4 | Las tareas pueden filtrarse por estado, prioridad, responsable y reunión. |
| RF-08.5 | El sistema identifica automáticamente las tareas cuya fecha límite ha pasado. |
| RF-08.6 | Se pueden crear tareas independientes (sin reunión asociada). |

### RF-09 — Dashboard y calendario

| ID | Requisito |
|----|-----------|
| RF-09.1 | El dashboard muestra las reuniones del día, próximas y recientes del usuario. |
| RF-09.2 | El dashboard muestra las tareas pendientes y atrasadas del usuario. |
| RF-09.3 | El dashboard muestra decisiones recientes de los equipos del usuario. |
| RF-09.4 | El calendario muestra las reuniones en vistas mensual, semanal y diaria. |
| RF-09.5 | Crear o modificar una reunión se refleja en el calendario sin recargar la página. |
| RF-09.6 | Las fechas se muestran en la zona horaria configurada por el usuario. |

### RF-10 — Notificaciones

| ID | Requisito |
|----|-----------|
| RF-10.1 | El usuario recibe notificación al ser invitado a una reunión. |
| RF-10.2 | Los participantes reciben notificación cuando una reunión es actualizada. |
| RF-10.3 | Los participantes reciben notificación cuando una reunión es cancelada. |
| RF-10.4 | El usuario recibe recordatorio antes de una reunión programada. |
| RF-10.5 | El usuario recibe notificación cuando se le asigna una tarea. |
| RF-10.6 | El usuario recibe notificación cuando una tarea asignada está próxima a vencer. |
| RF-10.7 | El usuario recibe notificación cuando una tarea asignada está vencida. |
| RF-10.8 | Las notificaciones se entregan in-app y por email. |
| RF-10.9 | El usuario puede marcar notificaciones como leídas. |

### RF-11 — Auditoría

| ID | Requisito |
|----|-----------|
| RF-11.1 | El sistema registra automáticamente las acciones críticas (ver lista en el plan). |
| RF-11.2 | Cada registro incluye: usuario, acción, entidad, ID de entidad, IP, timestamp y metadata. |
| RF-11.3 | Los registros de auditoría son de solo lectura (no se modifican ni eliminan). |
| RF-11.4 | Un OWNER o ADMIN puede consultar el log de auditoría de su equipo. |

### RF-12 — Búsqueda

| ID | Requisito |
|----|-----------|
| RF-12.1 | El usuario puede buscar reuniones, notas, decisiones, tareas y usuarios. |
| RF-12.2 | Los resultados se limitan al contenido al que el usuario tiene acceso. |
| RF-12.3 | Se pueden aplicar filtros por fecha, equipo, estado y prioridad. |

### RF-13 — Archivos adjuntos

| ID | Requisito |
|----|-----------|
| RF-13.1 | Los usuarios pueden adjuntar archivos a reuniones, notas y tareas. |
| RF-13.2 | El tamaño máximo por archivo es 10 MB. |
| RF-13.3 | Los tipos permitidos son: imágenes, PDF, documentos de texto y hojas de cálculo. |
| RF-13.4 | Al eliminar el registro del adjunto, el archivo también se elimina del almacenamiento. |

---

## 3. Requisitos no funcionales

### RNF-01 — Seguridad

| ID | Requisito |
|----|-----------|
| RNF-01.1 | Las contraseñas se almacenan con bcrypt (mínimo 10 rounds). |
| RNF-01.2 | Los JWT tienen duración máxima de 15 minutos. |
| RNF-01.3 | Los Refresh Tokens se almacenan en base de datos y pueden invalidarse. |
| RNF-01.4 | Los endpoints de auth tienen rate limiting (10 req/min en login, 5 req/h en forgot-password). |
| RNF-01.5 | Ningún secreto se almacena en el repositorio. |
| RNF-01.6 | Los logs no contienen contraseñas ni tokens. |
| RNF-01.7 | Los errores devueltos al cliente no exponen stack traces ni detalles internos. |
| RNF-01.8 | CORS configurado para aceptar únicamente el origen del frontend. |

### RNF-02 — Rendimiento

| ID | Requisito |
|----|-----------|
| RNF-02.1 | Los endpoints de listado usan paginación (máximo 100 registros por página). |
| RNF-02.2 | Las búsquedas full-text usan índices `tsvector` en PostgreSQL. |
| RNF-02.3 | El dashboard no realiza más de 5 queries a la base de datos. |

### RNF-03 — Disponibilidad y operación

| ID | Requisito |
|----|-----------|
| RNF-03.1 | El endpoint `GET /health` responde el estado del servicio y de la base de datos. |
| RNF-03.2 | El sistema puede ser reconstruido desde cero con `docker compose up` + migraciones + seed. |
| RNF-03.3 | Los logs son estructurados (JSON en producción). |
| RNF-03.4 | Cada request tiene un identificador único (`requestId`) trazable en los logs. |

### RNF-04 — Mantenibilidad

| ID | Requisito |
|----|-----------|
| RNF-04.1 | El código pasa lint sin errores antes de cada merge. |
| RNF-04.2 | El código pasa TypeScript sin errores (`tsc --noEmit`). |
| RNF-04.3 | Cada módulo tiene sus tests unitarios con cobertura de casos críticos. |
| RNF-04.4 | La API está documentada en Swagger (`/api/docs`). |
| RNF-04.5 | Las variables de entorno tienen un `.env.example` documentado. |

---

## 4. Casos de uso principales (resumen)

```
CU-01: Registrarse en la plataforma
CU-02: Iniciar sesión
CU-03: Recuperar contraseña
CU-04: Crear un equipo
CU-05: Invitar miembros a un equipo
CU-06: Crear una reunión
CU-07: Configurar participantes y agenda
CU-08: Conducir una reunión (registrar notas y decisiones)
CU-09: Crear tareas a partir de una reunión
CU-10: Hacer seguimiento de tareas pendientes
CU-11: Consultar el dashboard y el calendario
CU-12: Recibir y gestionar notificaciones
CU-13: Buscar información en la plataforma
CU-14: Adjuntar archivos a reuniones y tareas
CU-15: Consultar el historial de auditoría (OWNER/ADMIN)
```

---

## 5. Restricciones del proyecto

- El sistema no incluye videollamadas integradas (fuera de scope del MVP).
- No hay integración con calendarios externos (Google Calendar, Outlook) en v1.
- No hay facturación ni planes de pago en v1.
- El idioma de la interfaz es español en v1 (i18n pendiente para v2).
- Multi-tenancy no forma parte del MVP.
