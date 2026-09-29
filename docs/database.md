# Base de datos — MeetFlow

> FASE 0 · Análisis y diseño

---

## 1. Decisiones de diseño

| Decisión | Valor |
|----------|-------|
| Motor | PostgreSQL 16 |
| ORM | Prisma 5 |
| IDs | `cuid()` — colisión prácticamente imposible, URL-safe |
| Fechas | Siempre UTC en la base de datos (`DateTime` de Prisma) |
| Nombres de tablas | `snake_case` (Prisma `@@map`) |
| Nombres de campos | `camelCase` en Prisma, `snake_case` en SQL generado |
| Soft delete | No se usa en MVP; los registros eliminados se borran físicamente (excepto auditoría y notas/decisiones) |
| Zona horaria | Almacenada como string IANA (ej. `"America/Mexico_City"`) en `users` y `meetings` |

---

## 2. Crecimiento incremental del schema por fase

El schema **no se define completo desde el inicio**. Crece con cada fase para mantener coherencia con el desarrollo incremental.

| Fase | Entidades creadas |
|------|-------------------|
| FASE 2 | `users`, `refresh_tokens` |
| FASE 4 | `teams`, `team_members` |
| FASE 5 | `meetings` |
| FASE 6 | `meeting_participants`, `agenda_items` |
| FASE 7 | `meeting_notes`, `decisions` |
| FASE 8 | `tasks` |
| FASE 10 | `notifications` |
| FASE 12 | `audit_logs` |
| FASE 13 | `attachments` |

---

## 3. Entidades y campos

### 3.1 `users`

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  avatarUrl    String?
  timezone     String   @default("UTC")   // IANA timezone
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  refreshTokens     RefreshToken[]
  ownedTeams        Team[]             @relation("TeamOwner")
  teamMemberships   TeamMember[]
  organizedMeetings Meeting[]          @relation("MeetingOrganizer")
  participants      MeetingParticipant[]
  notes             MeetingNote[]
  decisions         Decision[]
  assignedTasks     Task[]             @relation("TaskAssignee")
  createdTasks      Task[]             @relation("TaskCreator")
  notifications     Notification[]
  auditLogs         AuditLog[]
  attachments       Attachment[]

  @@map("users")
}
```

**Índices**: `email` (único, ya definido).

---

### 3.2 `refresh_tokens`

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}
```

**Índices**: `token` (único), `userId`.

---

### 3.3 `teams`

```prisma
model Team {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner    User         @relation("TeamOwner", fields: [ownerId], references: [id])
  members  TeamMember[]
  meetings Meeting[]

  @@map("teams")
}
```

---

### 3.4 `team_members`

```prisma
model TeamMember {
  id       String   @id @default(cuid())
  teamId   String
  userId   String
  role     TeamRole @default(MEMBER)
  joinedAt DateTime @default(now())

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])   // un usuario no puede estar dos veces en el mismo equipo
  @@map("team_members")
}

enum TeamRole {
  OWNER
  ADMIN
  MEMBER
  GUEST
}
```

**Índices**: `(teamId, userId)` compuesto único.

---

### 3.5 `meetings`

```prisma
model Meeting {
  id          String        @id @default(cuid())
  title       String
  description String?
  teamId      String
  organizerId String
  status      MeetingStatus @default(DRAFT)
  startTime   DateTime      // UTC
  endTime     DateTime      // UTC
  timezone    String        // IANA (para mostrar al usuario)
  location    String?
  meetingUrl  String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  team         Team                 @relation(fields: [teamId], references: [id])
  organizer    User                 @relation("MeetingOrganizer", fields: [organizerId], references: [id])
  participants MeetingParticipant[]
  agendaItems  AgendaItem[]
  notes        MeetingNote[]
  decisions    Decision[]
  tasks        Task[]
  attachments  Attachment[]

  @@index([teamId])
  @@index([organizerId])
  @@index([startTime])
  @@index([status])
  @@map("meetings")
}

enum MeetingStatus {
  DRAFT
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

---

### 3.6 `meeting_participants`

```prisma
model MeetingParticipant {
  id         String              @id @default(cuid())
  meetingId  String
  userId     String
  status     ParticipantStatus   @default(INVITED)
  attendance AttendanceStatus?   // se rellena al finalizar la reunión
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt

  meeting Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([meetingId, userId])
  @@map("meeting_participants")
}

enum ParticipantStatus {
  INVITED
  ACCEPTED
  DECLINED
  TENTATIVE
}

enum AttendanceStatus {
  ATTENDED
  ABSENT
}
```

---

### 3.7 `agenda_items`

```prisma
model AgendaItem {
  id              String   @id @default(cuid())
  meetingId       String
  title           String
  description     String?
  durationMinutes Int?
  order           Int      // posición en la agenda (1-based)
  responsibleId   String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  meeting     Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  responsible User?   @relation(fields: [responsibleId], references: [id], onDelete: SetNull)

  @@index([meetingId, order])
  @@map("agenda_items")
}
```

---

### 3.8 `meeting_notes`

```prisma
model MeetingNote {
  id        String   @id @default(cuid())
  meetingId String
  authorId  String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  meeting     Meeting     @relation(fields: [meetingId], references: [id])
  // No Cascade: las notas se conservan aunque se elimine la reunión
  author      User        @relation(fields: [authorId], references: [id])
  attachments Attachment[]

  @@index([meetingId])
  @@map("meeting_notes")
}
```

---

### 3.9 `decisions`

```prisma
model Decision {
  id        String   @id @default(cuid())
  meetingId String
  authorId  String
  title     String
  content   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  meeting Meeting @relation(fields: [meetingId], references: [id])
  // No Cascade: las decisiones se conservan aunque se elimine la reunión
  author  User    @relation(fields: [authorId], references: [id])
  tasks   Task[]

  @@index([meetingId])
  @@map("decisions")
}
```

---

### 3.10 `tasks`

```prisma
model Task {
  id           String       @id @default(cuid())
  title        String
  description  String?
  status       TaskStatus   @default(TODO)
  priority     TaskPriority @default(MEDIUM)
  dueDate      DateTime?
  meetingId    String?      // opcional: tarea puede no estar ligada a reunión
  decisionId   String?      // opcional: puede originarse de una decisión
  assigneeId   String?
  creatorId    String
  teamId       String       // necesario para filtrar por equipo
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  meeting    Meeting?  @relation(fields: [meetingId], references: [id], onDelete: SetNull)
  decision   Decision? @relation(fields: [decisionId], references: [id], onDelete: SetNull)
  assignee   User?     @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  creator    User      @relation("TaskCreator", fields: [creatorId], references: [id])
  attachments Attachment[]

  @@index([assigneeId])
  @@index([teamId, status])
  @@index([dueDate])
  @@map("tasks")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  BLOCKED
  DONE
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

---

### 3.11 `notifications`

```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  body      String
  read      Boolean          @default(false)
  metadata  Json?            // datos adicionales (meetingId, taskId, etc.)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read])
  @@map("notifications")
}

enum NotificationType {
  MEETING_INVITATION
  MEETING_UPDATED
  MEETING_CANCELLED
  MEETING_REMINDER
  TASK_ASSIGNED
  TASK_DUE_SOON
  TASK_OVERDUE
  MENTION
  DECISION_CREATED
}
```

---

### 3.12 `audit_logs`

```prisma
model AuditLog {
  id        String      @id @default(cuid())
  userId    String
  action    AuditAction
  entity    String      // nombre de la entidad (Meeting, Task, etc.)
  entityId  String
  ipAddress String?
  userAgent String?
  metadata  Json?
  timestamp DateTime    @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entity, entityId])
  @@index([timestamp])
  @@map("audit_logs")
}

enum AuditAction {
  USER_LOGIN
  USER_LOGOUT
  MEETING_CREATED
  MEETING_UPDATED
  MEETING_CANCELLED
  MEMBER_INVITED
  MEMBER_REMOVED
  TASK_CREATED
  TASK_UPDATED
  TASK_COMPLETED
  DECISION_CREATED
}
```

---

### 3.13 `attachments`

```prisma
model Attachment {
  id          String   @id @default(cuid())
  filename    String
  mimeType    String
  sizeBytes   Int
  storageKey  String   // ruta relativa en disco o key en S3
  uploadedById String
  meetingId   String?
  noteId      String?
  taskId      String?
  createdAt   DateTime @default(now())

  uploader User         @relation(fields: [uploadedById], references: [id])
  meeting  Meeting?     @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  note     MeetingNote? @relation(fields: [noteId], references: [id], onDelete: Cascade)
  task     Task?        @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@map("attachments")
}
```

---

## 4. Diagrama de relaciones

```
users ──────────────────────────────────────────────────────────┐
  │                                                              │
  ├─── owns ──► teams ──► team_members ◄── users                │
  │                │                                            │
  │                └──► meetings ──────────────────────────────►┤
  │                       │                                     │
  │                       ├──► meeting_participants ◄── users   │
  │                       │                                     │
  │                       ├──► agenda_items ◄────── users       │
  │                       │    (responsable)                    │
  │                       │                                     │
  │                       ├──► meeting_notes ◄────── users      │
  │                       │       │                             │
  │                       │       └──► attachments              │
  │                       │                                     │
  │                       ├──► decisions ◄──────── users        │
  │                       │       │                             │
  │                       │       └──► tasks ◄─────────────────►┤
  │                       │                │                    │
  │                       └──► tasks       └──► attachments     │
  │                                                             │
  ├──► notifications                                            │
  ├──► audit_logs                                               │
  └──► attachments ────────────────────────────────────────────►┘
```

---

## 5. Índices importantes

| Tabla | Índice | Justificación |
|-------|--------|---------------|
| `users` | `email` (unique) | Login y búsqueda por email |
| `refresh_tokens` | `token` (unique) | Lookup en cada refresh |
| `team_members` | `(teamId, userId)` (unique) | Verificación de membresía |
| `meetings` | `teamId`, `organizerId`, `startTime`, `status` | Filtros del dashboard y calendario |
| `meeting_participants` | `(meetingId, userId)` (unique) | Verificación de participación |
| `agenda_items` | `(meetingId, order)` | Listado ordenado de agenda |
| `tasks` | `assigneeId`, `(teamId, status)`, `dueDate` | Dashboard de tareas |
| `notifications` | `(userId, read)` | Notificaciones no leídas del usuario |
| `audit_logs` | `userId`, `(entity, entityId)`, `timestamp` | Consultas de auditoría |

---

## 6. Reglas de integridad referencial

| Relación | `onDelete` | Justificación |
|----------|-----------|---------------|
| `team_members.userId` | Cascade | Si el usuario se elimina, sus membresías desaparecen |
| `team_members.teamId` | Cascade | Si el equipo se elimina, sus miembros desaparecen |
| `meeting_participants` | Cascade | Si la reunión se elimina, los participantes también |
| `agenda_items` | Cascade | Los puntos de agenda no tienen sentido sin reunión |
| `meeting_notes.meetingId` | Restrict / Sin acción | Las notas se conservan (evidencia) |
| `decisions.meetingId` | Restrict / Sin acción | Las decisiones se conservan (evidencia) |
| `tasks.meetingId` | SetNull | La tarea puede existir sin reunión |
| `tasks.decisionId` | SetNull | La tarea puede existir sin decisión |
| `tasks.assigneeId` | SetNull | La tarea existe aunque el responsable se elimine |
| `notifications.userId` | Cascade | Sin usuario no hay a quién notificar |
| `attachments.*` | Cascade | El adjunto desaparece con su contenedor |

---

## 7. Seed de desarrollo

El seed debe crear:

```
1 usuario OWNER  → owner@meetflow.dev  / password: "Password123!"
1 usuario ADMIN  → admin@meetflow.dev  / password: "Password123!"
2 usuarios MEMBER → member1@meetflow.dev, member2@meetflow.dev
1 equipo "Equipo Demo" con los 4 usuarios anteriores
2 reuniones pasadas (COMPLETED) con notas, decisiones y tareas
1 reunión futura (SCHEDULED) con agenda y participantes
3 tareas en distintos estados
```
