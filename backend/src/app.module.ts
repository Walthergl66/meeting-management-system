import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { resolve } from 'path';
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
import { AuditModule } from './modules/audit/audit.module';
import { AUTH } from './shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [
        resolve(process.cwd(), '../../.env'),
        resolve(process.cwd(), '.env'),
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
    AuditModule,
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
