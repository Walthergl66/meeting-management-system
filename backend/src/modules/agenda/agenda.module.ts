import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

@Module({
  imports: [PrismaModule, TeamsModule],
  controllers: [AgendaController],
  providers: [AgendaService],
})
export class AgendaModule {}
