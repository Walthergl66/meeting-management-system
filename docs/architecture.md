# Arquitectura — MeetFlow

> FASE 0 · Análisis y diseño

---

## 1. Visión general

MeetFlow es un sistema cliente-servidor compuesto por tres capas principales:

```
┌──────────────────────────────────────────────────────┐
│                   Cliente (Browser)                  │
│              Next.js 14 + React + PWA                │
└─────────────────────────┬────────────────────────────┘
                          │ HTTPS
              ┌───────────┼──────────┐
              │ REST API  │          │ WebSocket
              │           │          │
┌─────────────▼───────────▼──────────▼─────────────────┐
│                  NestJS API Server                    │
│          Módulos · Guards · Interceptors              │
└─────────────────────────┬────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
┌────────▼───────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  PostgreSQL    │ │   Storage   │ │  Email SMTP │
│  via Prisma    │ │ Local / S3  │ │  (futuro)   │
└────────────────┘ └─────────────┘ └─────────────┘
```

---

## 2. Frontend

### Tecnologías

| Tecnología | Rol |
|-----------|-----|
| Next.js 14 (App Router) | Framework de React con SSR/SSG y routing |
| React 18 | UI components |
| TypeScript | Tipado estático |
| Tailwind CSS | Estilos utilitarios |
| TanStack Query v5 | Server state, caché, sincronización |
| React Hook Form | Gestión de formularios |
| Zod | Validación de esquemas en cliente |
| `frontend/lib/shared/` | Tipos, enums y validaciones compartidos (copia mantenida a mano con el backend) |

### Estructura de carpetas (Next.js App Router)

```
frontend/
├── app/
│   ├── (auth)/               # Rutas públicas
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/          # Rutas protegidas
│   │   ├── layout.tsx        # Layout con auth guard
│   │   ├── page.tsx          # Dashboard
│   │   ├── meetings/
│   │   ├── tasks/
│   │   ├── teams/
│   │   └── settings/
│   └── layout.tsx
├── components/
│   ├── ui/                   # Componentes genéricos (Button, Input, Modal…)
│   ├── meetings/             # Componentes de dominio
│   ├── tasks/
│   └── teams/
├── lib/
│   ├── api/                  # Cliente HTTP (fetch wrapper con auth)
│   ├── auth/                 # Helpers de autenticación
│   └── utils/
├── hooks/                    # Custom hooks de React
└── public/
```

### Patrones de acceso a datos

- **Lectura**: TanStack Query (`useQuery`) para fetching, caché y sincronización.
- **Escritura**: TanStack Mutation (`useMutation`) + invalidación de queries.
- **Formularios**: React Hook Form + Zod para validación local antes de enviar.
- **Autenticación**: JWT almacenado en memoria; Refresh Token en cookie HttpOnly.

---

## 3. Backend

### Tecnologías

| Tecnología | Rol |
|-----------|-----|
| NestJS 10 | Framework estructurado de Node.js |
| TypeScript | Tipado estático |
| Prisma ORM | Acceso a base de datos, migraciones |
| `@nestjs/swagger` | Documentación y contratos de API |
| `@nestjs/jwt` | Generación y validación de JWT |
| `@nestjs/passport` | Estrategias de autenticación |
| `@nestjs/throttler` | Rate limiting |
| `@nestjs/event-emitter` | Eventos internos (notificaciones desacopladas) |
| `class-validator` | Validación de DTOs |
| `class-transformer` | Transformación de datos |
| `bcrypt` | Hashing de contraseñas |

### Estructura de carpetas (NestJS)

```
backend/src/
├── main.ts                        # Bootstrap, Swagger, CORS, pipes globales
├── app.module.ts                  # Módulo raíz
│
├── modules/
│   ├── auth/                      # Autenticación y sesiones
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/            # JWT, Local
│   │   ├── guards/                # JwtAuthGuard, LocalAuthGuard
│   │   └── dto/
│   │
│   ├── users/                     # Perfil de usuario
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │
│   ├── teams/                     # Equipos y membresías
│   │   ├── teams.module.ts
│   │   ├── teams.controller.ts
│   │   ├── teams.service.ts
│   │   ├── guards/                # TeamRoleGuard
│   │   └── dto/
│   │
│   ├── meetings/                  # Reuniones
│   │   ├── meetings.module.ts
│   │   ├── meetings.controller.ts
│   │   ├── meetings.service.ts
│   │   └── dto/
│   │
│   ├── participants/              # Participantes de reunión
│   ├── agenda/                    # Agenda de reuniones
│   ├── notes/                     # Notas de reuniones
│   ├── decisions/                 # Decisiones de reuniones
│   ├── tasks/                     # Tareas y seguimiento
│   ├── notifications/             # Notificaciones in-app y email
│   ├── audit/                     # Auditoría de acciones
│   ├── search/                    # Búsqueda full-text
│   ├── attachments/               # Archivos adjuntos
│   └── assistant/                 # Asistente IA (FASE 15)
│
├── common/
│   ├── decorators/                # @CurrentUser, @Roles, @Public
│   ├── filters/                   # GlobalExceptionFilter
│   ├── interceptors/              # TransformResponseInterceptor, LoggingInterceptor
│   ├── pipes/                     # ValidationPipe global
│   ├── guards/                    # RolesGuard global
│   └── dto/                       # PaginationDto, ResponseDto
│
└── prisma/
    ├── prisma.module.ts
    └── prisma.service.ts
```

### Patrón de capas dentro de cada módulo

```
Request HTTP
     │
     ▼
Controller  ← valida DTO con class-validator
     │       ← extrae usuario actual con @CurrentUser
     ▼
Service     ← lógica de negocio
     │       ← verifica permisos
     │       ← emite eventos de dominio
     ▼
PrismaService ← acceso a base de datos
     │
     ▼
PostgreSQL
```

### Interceptors y Pipes globales

| Componente | Responsabilidad |
|-----------|----------------|
| `ValidationPipe` | Valida y transforma todos los DTOs automáticamente |
| `TransformResponseInterceptor` | Envuelve toda respuesta en `{ data, message }` |
| `GlobalExceptionFilter` | Captura todas las excepciones y estandariza el formato de error |
| `LoggingInterceptor` | Registra request/response con `requestId` |

---

## 4. Base de datos

Ver [`database.md`](./database.md) para el detalle completo.

**Motor**: PostgreSQL 16  
**ORM**: Prisma 5  
**Convención**: tablas en `snake_case`, campos en `camelCase` en Prisma, IDs con `cuid()`.

---

## 5. Comunicación en tiempo real

**Tecnología**: Socket.IO via `@nestjs/websockets`

**Patrón**: REST para CRUD → WebSocket solo para notificaciones push.

```
Cambio de estado (REST)
        │
        ▼
   Base de datos
        │
        ▼
 Emit WebSocket event
        │
        ▼
 Clientes conectados → actualización reactiva en UI
```

**Namespaces planificados**:

| Namespace | Propósito |
|-----------|-----------|
| `/notifications` | Notificaciones in-app en tiempo real |
| `/meetings` | Actualizaciones durante reuniones activas |

---

## 6. Autenticación y autorización

### Flujo de autenticación

```
POST /auth/login
     │
     ▼
Verificar credenciales (bcrypt)
     │
     ▼
Generar JWT (15 min) + Refresh Token (7 días)
     │
     ▼
Refresh Token → DB (refresh_tokens)
JWT → respuesta al cliente
     │
     ▼
Cliente: Bearer <JWT> en Authorization header
```

### Autorización por capas

1. **JwtAuthGuard** (global, salvo rutas `@Public`): verifica JWT en cada request.
2. **TeamRoleGuard**: verifica el rol del usuario en el equipo referenciado en la petición.
3. **Ownership check en Service**: verifica que el recurso pertenece al usuario o tiene permisos sobre él.

---

## 7. Módulo de notificaciones (desacoplado)

```
MeetingService.create()
        │
        │ emit('meeting.invitation', payload)
        ▼
NotificationListener
        │
        ├── NotificationService.createInApp()
        └── EmailService.send() (async, no bloquea)
```

Los módulos de negocio no importan `NotificationService` directamente. Solo emiten eventos.

---

## 8. Infraestructura Docker

```
docker-compose.yml
├── db         → PostgreSQL 16 (puerto 5432)
├── api        → NestJS (puerto 3000)
└── web        → Next.js (puerto 3001)
```

Variables de entorno gestionadas con `.env` (local) + `.env.example` (documentado en el repo).

---

## 9. Convenciones de código

| Aspecto | Convención |
|---------|-----------|
| Identificadores y código | inglés |
| Comentarios y documentación | español |
| Nombres de archivos | `kebab-case.ts` |
| Clases | `PascalCase` |
| Variables y funciones | `camelCase` |
| Tablas DB | `snake_case` |
| Ramas Git | `feature/nombre-corto`, `fix/descripcion` |
| Commits | Conventional Commits (`feat:`, `fix:`, etc.) |
| Linting | ESLint + Prettier (Biome en evaluación) |

---

## 10. Variables de entorno

Definidas en `.env` (nunca en el repo). Documentadas en `.env.example`.

### Backend (`backend`)

```env
# App
NODE_ENV=development
PORT=3000

# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/meetflow

# JWT
JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=15m
# Los refresh tokens se almacenan hasheados (SHA-256): no hay secreto propio
REFRESH_TOKEN_EXPIRES_IN=7d

# Storage
STORAGE_DRIVER=local          # local | s3
STORAGE_LOCAL_PATH=./uploads
AWS_BUCKET=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@meetflow.app

# AI (FASE 15)
GEMINI_API_KEY=
```

### Frontend (`frontend`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```
