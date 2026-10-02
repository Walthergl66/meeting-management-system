import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeBridgeService } from './realtime-bridge.service';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [RealtimeGateway, RealtimeBridgeService],
  exports: [RealtimeGateway, RealtimeBridgeService],
})
export class RealtimeModule {}
