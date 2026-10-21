import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { NotesModule } from './modules/notes/notes.module';
import { DecisionsModule } from './modules/decisions/decisions.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { AuditModule } from './modules/audit/audit.module';
import { SearchModule } from './modules/search/search.module';
import { AUTH } from './shared';

/**
 * Raíz del paquete backend/ (donde vive su package.json y su .env), hallada
 * subiendo desde este archivo. Así ConfigModule encuentra backend/.env tanto si
 * se ejecuta con `pnpm dev` (dist/src/app.module.js) como con ts-node desde
 * cualquier directorio de trabajo, sin depender de `dotenv -e`.
 */
function findPackageRoot(start: string): string {
  let dir = start;

  for (;;) {
    if (existsSync(resolve(dir, 'package.json'))) {
      return dir;
    }

    const parent = dirname(dir);

    if (parent === dir) {
      return start;
    }

    dir = parent;
  }
}

const packageRoot = findPackageRoot(__dirname);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // El .env vive en la raíz del paquete (backend/.env): este proyecto es
      // independiente y no comparte archivo con el frontend.
      // No se resuelve desde __dirname porque el decorador se evalúa en
      // dist/src/app.module.js (o src/ con ts-node), es decir un nivel por
      // debajo de la raíz del paquete; subir dos niveles con process.cwd() es
      // igual de frágil. Se busca el paquete por sus package.json hacia arriba.
      envFilePath: [
        resolve(packageRoot, '.env'),
        resolve(packageRoot, '.env.local'),
      ],
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: AUTH.THROTTLE_TTL_MS,
        limit: AUTH.THROTTLE_LIMIT,
      },
    ]),
    PrismaModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    UsersModule,
    TeamsModule,
    MeetingsModule,
    ParticipantsModule,
    AgendaModule,
    NotesModule,
    DecisionsModule,
    TasksModule,
    NotificationsModule,
    DashboardModule,
    RealtimeModule,
    AttachmentsModule,
    AssistantModule,
    AuditModule,
    SearchModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
